# Tallyview Transparency Score: Technical Specification

## Overview

The Transparency Score is a 0-100 rating system that measures how transparent a U.S. nonprofit organization is based on publicly available data. It does NOT measure effectiveness, efficiency, or impact — only the degree to which oversight stakeholders can see what's happening inside the organization.

**Core principle:** A nonprofit could be terribly run but highly transparent, or excellent but opaque. We measure the second axis.

---

## Data Sources

### Primary: IRS Form 990 Data

**Source:** IRS Exempt Organizations Business Master File (EO BMF) and 990 e-file dataset

**Access methods:**

1. **IRS direct download:**
   - EO BMF: https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
   - 990 e-file data: https://www.irs.gov/statistics/soi-tax-stats-annual-extract-of-tax-exempt-organization-financial-data

2. **ProPublica Nonprofit Explorer API:**
   ```
   Base URL: https://projects.propublica.org/nonprofits/api/v2/
   
   # Get organization by EIN
   GET /organizations/{ein}.json
   
   # Search organizations
   GET /search.json?q={query}&state={state_code}
   
   # Get specific filing
   GET /organizations/{ein}/filings/{tax_period}.json
   ```

3. **AWS Open Data (IRS 990 filings):**
   ```
   s3://irs-form-990/
   ```
   Contains XML files of electronically filed 990s.

**Key 990 fields to extract:**

| Field | Location | Purpose |
|-------|----------|---------|
| EIN | Header | Unique identifier |
| Organization name | Part I, Line 1 | Display |
| Fiscal year end | Header | Filing currency calculation |
| Total revenue | Part I, Line 12 | Size classification |
| Total assets | Part I, Line 20 | Size classification |
| Total compensation | Part VII | Compensation analysis |
| Officer names | Part VII | Governance mapping |
| Schedules filed | Checkboxes | Disclosure completeness |
| Schedule O content | Schedule O | Narrative analysis |
| Diversion of assets | Part VI, Line 5 | Red flag detection |
| Material changes | Part VI | Red flag detection |

### Secondary: State Charitable Registration

**Challenge:** 41 states require registration; formats vary widely.

**Approach for MVP:** Focus on states with accessible APIs or bulk data:
- California: https://oag.ca.gov/charities
- New York: https://www.charitiesnys.com/
- Massachusetts: https://www.mass.gov/public-charities

**Data points:**
- Registration status (active, revoked, delinquent)
- Registration expiration date
- Annual report filing status

### Tertiary: Federal Audit Clearinghouse

**Source:** https://facweb.census.gov/

**Access:** Bulk download or API for organizations with $750K+ federal expenditures

**Data points:**
- Audit opinion type (unqualified, qualified, adverse, disclaimer)
- Material weaknesses reported
- Significant deficiencies
- Going concern notes

### Quaternary: Organization Websites

**Approach:** Web scraping for voluntary disclosures

**Check for presence of:**
- 990 PDF posted
- Audited financial statements
- Annual report
- Board roster
- Governance policies (conflict of interest, whistleblower)

**Implementation:** Use headless browser (Puppeteer/Playwright) with rate limiting

---

## Scoring Methodology

### Dimension 1: Filing Currency (25 points max)

Measures how current the organization's public filings are.

**Calculation:**

```python
def calculate_filing_currency(fiscal_year_end: date, filing_date: date, today: date) -> int:
    """
    Calculate filing currency score based on when 990 was filed
    relative to fiscal year end.
    
    990s are due on the 15th day of the 5th month after fiscal year end.
    Extensions can push this to 11th month.
    """
    
    # Check if we have a filing for the most recent complete fiscal year
    expected_fiscal_year_end = get_most_recent_fiscal_year_end(today)
    
    if fiscal_year_end < expected_fiscal_year_end - timedelta(days=365):
        # No filing for most recent fiscal year
        return 0
    
    months_after_fye = (filing_date - fiscal_year_end).days / 30
    
    if months_after_fye <= 6:
        return 25  # Filed early or on time
    elif months_after_fye <= 9:
        return 20  # Filed within extension period
    elif months_after_fye <= 12:
        return 15  # Filed late but within year
    elif months_after_fye <= 18:
        return 10  # Significantly late
    else:
        return 5   # Extremely late but filed
```

**Edge cases:**
- Organization files 990-N (e-Postcard): Score based on 990-N filing date
- Organization files 990-EZ: Same logic as 990
- Organization is a church (exempt from filing): Exclude from scoring or flag as "exempt"
- First-year organization: Score based on available data with notation

### Dimension 2: Disclosure Completeness (25 points max)

Measures how thoroughly the organization completes its required and optional disclosures.

**Scoring rubric:**

```python
def calculate_disclosure_completeness(filing: Form990) -> int:
    score = 0
    
    # Part VII - Compensation disclosure (8 points max)
    if filing.part_vii_completed:
        score += 4
        if filing.all_officers_hours_reported:
            score += 2
        if filing.compensation_narrative_provided:
            score += 2
    
    # Schedule completeness (8 points max)
    required_schedules = get_required_schedules(filing)
    filed_schedules = filing.schedules_filed
    
    if set(required_schedules).issubset(set(filed_schedules)):
        score += 4  # All required schedules filed
    else:
        missing_ratio = len(set(required_schedules) - set(filed_schedules)) / len(required_schedules)
        score += int(4 * (1 - missing_ratio))
    
    # Check for voluntary schedules that indicate transparency
    voluntary_schedules = ['Schedule O', 'Schedule I', 'Schedule J']
    for sched in voluntary_schedules:
        if sched in filed_schedules and schedule_is_substantive(filing, sched):
            score += 1  # Up to 4 additional points
    
    # Schedule O narrative quality (5 points max)
    schedule_o_score = evaluate_schedule_o(filing.schedule_o_content)
    score += schedule_o_score
    
    # Related party transaction disclosure (4 points max)
    if filing.has_related_party_transactions:
        if filing.related_party_transactions_explained:
            score += 4
        else:
            score += 1  # Disclosed but not explained
    else:
        score += 4  # No related party transactions to disclose
    
    return min(score, 25)


def evaluate_schedule_o(content: str) -> int:
    """
    Evaluate Schedule O narrative quality.
    Returns 0-5 points.
    """
    if not content or len(content) < 100:
        return 0
    
    # Check for boilerplate vs substantive content
    boilerplate_phrases = [
        "see attached",
        "none",
        "n/a",
        "not applicable",
        "same as prior year"
    ]
    
    content_lower = content.lower()
    boilerplate_count = sum(1 for phrase in boilerplate_phrases if phrase in content_lower)
    
    if boilerplate_count > 3:
        return 1
    
    # Length and substance scoring
    word_count = len(content.split())
    
    if word_count < 200:
        return 2
    elif word_count < 500:
        return 3
    elif word_count < 1000:
        return 4
    else:
        return 5
```

### Dimension 3: Governance Visibility (20 points max)

Measures whether stakeholders can see how decisions are made.

**Scoring rubric:**

```python
def calculate_governance_visibility(filing: Form990, website_data: WebsiteCheck) -> int:
    score = 0
    
    # Board roster publicly available (4 points)
    if website_data.board_roster_found or filing.part_vii_lists_all_directors:
        score += 4
    
    # Board meeting frequency disclosed (3 points)
    # Check Part VI or Schedule O for meeting frequency
    if filing.board_meeting_frequency_disclosed:
        score += 3
    
    # Conflict of interest policy (4 points)
    # Part VI, Line 12a asks if org has COI policy
    if filing.part_vi_line_12a == 'Yes':
        score += 2
        if filing.coi_policy_publicly_available or website_data.coi_policy_found:
            score += 2
    
    # Whistleblower policy (3 points)
    # Part VI, Line 13 asks about whistleblower policy
    if filing.part_vi_line_13 == 'Yes':
        score += 2
        if website_data.whistleblower_policy_found:
            score += 1
    
    # Executive compensation process (3 points)
    # Part VI, Line 15 asks about compensation review process
    if filing.part_vi_line_15a == 'Yes' and filing.part_vi_line_15b == 'Yes':
        score += 3
    elif filing.part_vi_line_15a == 'Yes':
        score += 1
    
    # Document retention policy (3 points)
    # Part VI, Line 14 asks about document retention policy
    if filing.part_vi_line_14 == 'Yes':
        score += 2
        if website_data.document_retention_policy_found:
            score += 1
    
    return min(score, 20)
```

### Dimension 4: Financial Accessibility (15 points max)

Measures how easy it is for stakeholders to access and understand financial information.

**Scoring rubric:**

```python
def calculate_financial_accessibility(filing: Form990, website_data: WebsiteCheck, 
                                       candid_profile: CandidProfile) -> int:
    score = 0
    
    # 990 posted on own website (3 points)
    if website_data.form_990_found:
        score += 3
    
    # Audited financial statements posted (4 points)
    if website_data.audit_report_found:
        score += 4
    elif website_data.financial_statements_found:
        score += 2
    
    # Annual report with financials published (3 points)
    if website_data.annual_report_found:
        if website_data.annual_report_has_financials:
            score += 3
        else:
            score += 1
    
    # Budget publicly available (3 points)
    if website_data.budget_found:
        score += 3
    
    # GuideStar/Candid profile completeness (2 points)
    if candid_profile:
        if candid_profile.seal_level in ['Gold', 'Platinum']:
            score += 2
        elif candid_profile.seal_level == 'Silver':
            score += 1
    
    return min(score, 15)
```

### Dimension 5: Red Flag Absence (15 points max)

Start at 15, subtract for detected red flags.

**Scoring rubric:**

```python
def calculate_red_flag_absence(filing: Form990, audit_data: AuditData, 
                                peer_data: PeerBenchmarks) -> int:
    score = 15
    deductions = []
    
    # Qualified or adverse audit opinion (-5 points)
    if audit_data:
        if audit_data.opinion_type in ['Qualified', 'Adverse', 'Disclaimer']:
            score -= 5
            deductions.append({
                'flag': 'Qualified or adverse audit opinion',
                'severity': 'critical',
                'deduction': 5
            })
    
    # Material weakness in internal controls (-4 points)
    if audit_data and audit_data.material_weakness:
        score -= 4
        deductions.append({
            'flag': 'Material weakness in internal controls',
            'severity': 'critical',
            'deduction': 4
        })
    
    # Going concern note (-3 points)
    if audit_data and audit_data.going_concern:
        score -= 3
        deductions.append({
            'flag': 'Going concern note in audit',
            'severity': 'high',
            'deduction': 3
        })
    
    # Significant prior period adjustments (-3 points)
    if filing.prior_period_adjustments and abs(filing.prior_period_adjustments) > (filing.total_revenue * 0.05):
        score -= 3
        deductions.append({
            'flag': 'Significant prior period adjustments',
            'severity': 'high',
            'deduction': 3
        })
    
    # Executive compensation outlier (-2 points)
    if peer_data:
        ceo_comp = get_ceo_compensation(filing)
        if ceo_comp:
            percentile = peer_data.get_compensation_percentile(ceo_comp, filing.total_revenue)
            if percentile >= 95:
                score -= 2
                deductions.append({
                    'flag': f'Executive compensation in {percentile}th percentile',
                    'severity': 'medium',
                    'deduction': 2,
                    'details': {
                        'ceo_compensation': ceo_comp,
                        'percentile': percentile,
                        'peer_median': peer_data.median_ceo_comp
                    }
                })
    
    # Related party transactions without clear board approval (-3 points)
    if filing.has_related_party_transactions:
        if not filing.related_party_board_approval_documented:
            score -= 3
            deductions.append({
                'flag': 'Related party transactions without documented board approval',
                'severity': 'high',
                'deduction': 3
            })
    
    # Frequent auditor changes (-2 points)
    auditor_history = get_auditor_history(filing.ein, years=5)
    if len(set(auditor_history)) >= 3:  # 3+ different auditors in 5 years
        score -= 2
        deductions.append({
            'flag': 'Frequent auditor changes',
            'severity': 'medium',
            'deduction': 2
        })
    
    # State registration lapses (-2 points)
    state_status = get_state_registration_status(filing.ein, filing.state)
    if state_status and state_status.has_lapses:
        score -= 2
        deductions.append({
            'flag': 'State registration lapses',
            'severity': 'medium',
            'deduction': 2
        })
    
    # 990 amendments filed (-1 point)
    if filing.is_amended:
        score -= 1
        deductions.append({
            'flag': '990 amendment filed',
            'severity': 'low',
            'deduction': 1
        })
    
    return max(score, 0), deductions
```

### Total Score Calculation

```python
def calculate_transparency_score(ein: str) -> TransparencyScore:
    """
    Calculate complete transparency score for an organization.
    """
    # Fetch all required data
    filing = get_most_recent_990(ein)
    website_data = check_organization_website(filing.website)
    candid_profile = get_candid_profile(ein)
    audit_data = get_audit_data(ein)
    peer_data = get_peer_benchmarks(filing.ntee_code, filing.total_revenue)
    
    # Calculate each dimension
    filing_currency = calculate_filing_currency(
        filing.fiscal_year_end,
        filing.filing_date,
        date.today()
    )
    
    disclosure_completeness = calculate_disclosure_completeness(filing)
    
    governance_visibility = calculate_governance_visibility(filing, website_data)
    
    financial_accessibility = calculate_financial_accessibility(
        filing, website_data, candid_profile
    )
    
    red_flag_absence, red_flags = calculate_red_flag_absence(
        filing, audit_data, peer_data
    )
    
    # Sum dimensions
    total_score = (
        filing_currency +
        disclosure_completeness +
        governance_visibility +
        financial_accessibility +
        red_flag_absence
    )
    
    return TransparencyScore(
        ein=ein,
        total_score=total_score,
        dimensions={
            'filing_currency': {
                'score': filing_currency,
                'max': 25
            },
            'disclosure_completeness': {
                'score': disclosure_completeness,
                'max': 25
            },
            'governance_visibility': {
                'score': governance_visibility,
                'max': 20
            },
            'financial_accessibility': {
                'score': financial_accessibility,
                'max': 15
            },
            'red_flag_absence': {
                'score': red_flag_absence,
                'max': 15
            }
        },
        red_flags=red_flags,
        data_sources={
            'filing_year': filing.tax_year,
            'filing_date': filing.filing_date,
            'website_checked': website_data.check_date if website_data else None,
            'audit_year': audit_data.fiscal_year if audit_data else None
        },
        calculated_at=datetime.utcnow()
    )
```

---

## Peer Benchmarking

### NTEE Classification

Use NTEE (National Taxonomy of Exempt Entities) codes to group similar organizations.

**Major categories:**
- A: Arts, Culture, Humanities
- B: Education
- C-D: Environment
- E-H: Health
- I-K: Human Services
- L: Housing
- M-N: Public & Societal Benefit
- O: Youth Development
- P: Human Services
- Q: International
- R-W: Public & Societal Benefit
- X: Religion
- Y: Mutual Benefit
- Z: Unknown

### Peer Group Definition

```python
def get_peer_group(ntee_code: str, total_revenue: float, state: str = None) -> PeerGroup:
    """
    Define peer group for benchmarking.
    
    Peer groups are defined by:
    1. NTEE major category (first letter)
    2. Revenue band
    3. Optionally, geographic region
    """
    
    ntee_major = ntee_code[0] if ntee_code else 'Z'
    
    # Revenue bands
    if total_revenue < 100_000:
        revenue_band = 'micro'
    elif total_revenue < 1_000_000:
        revenue_band = 'small'
    elif total_revenue < 10_000_000:
        revenue_band = 'medium'
    elif total_revenue < 50_000_000:
        revenue_band = 'large'
    else:
        revenue_band = 'enterprise'
    
    return PeerGroup(
        ntee_major=ntee_major,
        revenue_band=revenue_band,
        state=state
    )
```

### Percentile Calculations

```python
def calculate_percentile(value: float, peer_values: List[float]) -> int:
    """
    Calculate percentile rank of a value within peer group.
    """
    if not peer_values:
        return None
    
    sorted_values = sorted(peer_values)
    rank = bisect.bisect_left(sorted_values, value)
    percentile = int((rank / len(sorted_values)) * 100)
    
    return percentile


def get_compensation_percentile(ceo_comp: float, org_revenue: float, 
                                 peer_group: PeerGroup) -> int:
    """
    Calculate CEO compensation percentile within peer group.
    
    Compensation is evaluated relative to:
    1. Absolute amount
    2. Ratio to total revenue
    """
    peer_comps = query_peer_compensations(peer_group)
    
    return calculate_percentile(ceo_comp, peer_comps)
```

---

## Database Schema

### PostgreSQL Schema

```sql
-- Organizations table
CREATE TABLE organizations (
    ein VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    ntee_code VARCHAR(10),
    subsection_code VARCHAR(2),
    ruling_date DATE,
    website VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_state ON organizations(state);
CREATE INDEX idx_organizations_ntee ON organizations(ntee_code);

-- Filings table (one row per 990 filing)
CREATE TABLE filings (
    id SERIAL PRIMARY KEY,
    ein VARCHAR(10) NOT NULL REFERENCES organizations(ein),
    tax_year INTEGER NOT NULL,
    form_type VARCHAR(10) NOT NULL, -- '990', '990-EZ', '990-PF', '990-N'
    fiscal_year_end DATE NOT NULL,
    filing_date DATE,
    total_revenue BIGINT,
    total_expenses BIGINT,
    total_assets BIGINT,
    total_liabilities BIGINT,
    xml_url VARCHAR(500),
    pdf_url VARCHAR(500),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ein, tax_year, form_type)
);

CREATE INDEX idx_filings_ein ON filings(ein);
CREATE INDEX idx_filings_tax_year ON filings(tax_year);

-- Compensation table
CREATE TABLE compensation (
    id SERIAL PRIMARY KEY,
    filing_id INTEGER NOT NULL REFERENCES filings(id),
    person_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    average_hours_per_week DECIMAL(5,2),
    reportable_compensation BIGINT,
    other_compensation BIGINT,
    is_officer BOOLEAN DEFAULT FALSE,
    is_director BOOLEAN DEFAULT FALSE,
    is_key_employee BOOLEAN DEFAULT FALSE,
    is_highest_compensated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compensation_filing ON compensation(filing_id);

-- Transparency scores table
CREATE TABLE transparency_scores (
    id SERIAL PRIMARY KEY,
    ein VARCHAR(10) NOT NULL REFERENCES organizations(ein),
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
    filing_currency_score INTEGER NOT NULL,
    disclosure_completeness_score INTEGER NOT NULL,
    governance_visibility_score INTEGER NOT NULL,
    financial_accessibility_score INTEGER NOT NULL,
    red_flag_absence_score INTEGER NOT NULL,
    percentile INTEGER,
    peer_group_ntee VARCHAR(1),
    peer_group_revenue_band VARCHAR(20),
    data_sources JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Only keep most recent score per org
    UNIQUE(ein)
);

CREATE INDEX idx_scores_total ON transparency_scores(total_score);
CREATE INDEX idx_scores_percentile ON transparency_scores(percentile);

-- Score history (for tracking changes over time)
CREATE TABLE score_history (
    id SERIAL PRIMARY KEY,
    ein VARCHAR(10) NOT NULL REFERENCES organizations(ein),
    total_score INTEGER NOT NULL,
    dimension_scores JSONB NOT NULL,
    calculated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_score_history_ein ON score_history(ein);
CREATE INDEX idx_score_history_date ON score_history(calculated_at);

-- Red flags table
CREATE TABLE red_flags (
    id SERIAL PRIMARY KEY,
    score_id INTEGER NOT NULL REFERENCES transparency_scores(id),
    flag_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
    deduction INTEGER NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_red_flags_score ON red_flags(score_id);
CREATE INDEX idx_red_flags_severity ON red_flags(severity);

-- Website checks table
CREATE TABLE website_checks (
    id SERIAL PRIMARY KEY,
    ein VARCHAR(10) NOT NULL REFERENCES organizations(ein),
    website_url VARCHAR(500),
    check_date TIMESTAMP NOT NULL,
    is_accessible BOOLEAN,
    board_roster_found BOOLEAN DEFAULT FALSE,
    form_990_found BOOLEAN DEFAULT FALSE,
    audit_report_found BOOLEAN DEFAULT FALSE,
    financial_statements_found BOOLEAN DEFAULT FALSE,
    annual_report_found BOOLEAN DEFAULT FALSE,
    annual_report_has_financials BOOLEAN DEFAULT FALSE,
    budget_found BOOLEAN DEFAULT FALSE,
    coi_policy_found BOOLEAN DEFAULT FALSE,
    whistleblower_policy_found BOOLEAN DEFAULT FALSE,
    document_retention_policy_found BOOLEAN DEFAULT FALSE,
    raw_results JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_website_checks_ein ON website_checks(ein);

-- Audit data table
CREATE TABLE audit_data (
    id SERIAL PRIMARY KEY,
    ein VARCHAR(10) NOT NULL REFERENCES organizations(ein),
    fiscal_year INTEGER NOT NULL,
    auditor_name VARCHAR(255),
    opinion_type VARCHAR(50), -- 'Unqualified', 'Qualified', 'Adverse', 'Disclaimer'
    material_weakness BOOLEAN DEFAULT FALSE,
    significant_deficiency BOOLEAN DEFAULT FALSE,
    going_concern BOOLEAN DEFAULT FALSE,
    federal_expenditures BIGINT,
    source VARCHAR(50), -- 'FAC', 'website', 'manual'
    source_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ein, fiscal_year)
);

CREATE INDEX idx_audit_ein ON audit_data(ein);

-- Peer benchmarks table (precomputed)
CREATE TABLE peer_benchmarks (
    id SERIAL PRIMARY KEY,
    ntee_major VARCHAR(1) NOT NULL,
    revenue_band VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    percentile_10 DECIMAL(15,2),
    percentile_25 DECIMAL(15,2),
    percentile_50 DECIMAL(15,2),
    percentile_75 DECIMAL(15,2),
    percentile_90 DECIMAL(15,2),
    percentile_95 DECIMAL(15,2),
    percentile_99 DECIMAL(15,2),
    sample_size INTEGER,
    calculated_at TIMESTAMP NOT NULL,
    
    UNIQUE(ntee_major, revenue_band, metric_name)
);

CREATE INDEX idx_peer_benchmarks_lookup ON peer_benchmarks(ntee_major, revenue_band);
```

---

## API Design

### RESTful Endpoints

```yaml
openapi: 3.0.0
info:
  title: Tallyview Transparency Score API
  version: 1.0.0
  description: API for accessing nonprofit transparency scores

paths:
  /v1/organizations/{ein}:
    get:
      summary: Get organization details and transparency score
      parameters:
        - name: ein
          in: path
          required: true
          schema:
            type: string
            pattern: '^\d{2}-?\d{7}$'
      responses:
        200:
          description: Organization found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrganizationWithScore'
        404:
          description: Organization not found

  /v1/organizations/search:
    get:
      summary: Search organizations
      parameters:
        - name: q
          in: query
          description: Search query (name, city, or EIN)
          schema:
            type: string
        - name: state
          in: query
          schema:
            type: string
            minLength: 2
            maxLength: 2
        - name: ntee
          in: query
          description: NTEE code or major category
          schema:
            type: string
        - name: min_score
          in: query
          schema:
            type: integer
            minimum: 0
            maximum: 100
        - name: max_score
          in: query
          schema:
            type: integer
            minimum: 0
            maximum: 100
        - name: sort
          in: query
          schema:
            type: string
            enum: [score_desc, score_asc, name_asc, revenue_desc]
            default: score_desc
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
      responses:
        200:
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResults'

  /v1/organizations/{ein}/score:
    get:
      summary: Get detailed transparency score breakdown
      parameters:
        - name: ein
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Score details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TransparencyScoreDetail'

  /v1/organizations/{ein}/score/history:
    get:
      summary: Get score history over time
      parameters:
        - name: ein
          in: path
          required: true
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        200:
          description: Score history
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ScoreHistoryEntry'

  /v1/organizations/{ein}/peers:
    get:
      summary: Get peer comparison data
      parameters:
        - name: ein
          in: path
          required: true
          schema:
            type: string
      responses:
        200:
          description: Peer comparison
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PeerComparison'

components:
  schemas:
    OrganizationWithScore:
      type: object
      properties:
        ein:
          type: string
        name:
          type: string
        city:
          type: string
        state:
          type: string
        ntee_code:
          type: string
        total_revenue:
          type: integer
        total_assets:
          type: integer
        website:
          type: string
        transparency_score:
          $ref: '#/components/schemas/TransparencyScoreSummary'
        verified_status:
          type: boolean
        last_updated:
          type: string
          format: date-time

    TransparencyScoreSummary:
      type: object
      properties:
        total:
          type: integer
          minimum: 0
          maximum: 100
        percentile:
          type: integer
          minimum: 0
          maximum: 100
        red_flag_count:
          type: integer
        calculated_at:
          type: string
          format: date-time

    TransparencyScoreDetail:
      type: object
      properties:
        ein:
          type: string
        total_score:
          type: integer
        dimensions:
          type: object
          properties:
            filing_currency:
              $ref: '#/components/schemas/DimensionScore'
            disclosure_completeness:
              $ref: '#/components/schemas/DimensionScore'
            governance_visibility:
              $ref: '#/components/schemas/DimensionScore'
            financial_accessibility:
              $ref: '#/components/schemas/DimensionScore'
            red_flag_absence:
              $ref: '#/components/schemas/DimensionScore'
        red_flags:
          type: array
          items:
            $ref: '#/components/schemas/RedFlag'
        percentile:
          type: integer
        peer_group:
          $ref: '#/components/schemas/PeerGroup'
        data_sources:
          type: object
          properties:
            filing_year:
              type: integer
            filing_date:
              type: string
              format: date
            website_checked:
              type: string
              format: date
            audit_year:
              type: integer
        calculated_at:
          type: string
          format: date-time

    DimensionScore:
      type: object
      properties:
        score:
          type: integer
        max:
          type: integer
        factors:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              points:
                type: integer
              max_points:
                type: integer
              status:
                type: string
                enum: [met, partial, not_met, not_applicable]

    RedFlag:
      type: object
      properties:
        flag_type:
          type: string
        severity:
          type: string
          enum: [critical, high, medium, low]
        deduction:
          type: integer
        details:
          type: object

    PeerGroup:
      type: object
      properties:
        ntee_major:
          type: string
        ntee_description:
          type: string
        revenue_band:
          type: string
        sample_size:
          type: integer

    PeerComparison:
      type: object
      properties:
        organization_score:
          type: integer
        peer_group:
          $ref: '#/components/schemas/PeerGroup'
        distribution:
          type: object
          properties:
            percentile_10:
              type: integer
            percentile_25:
              type: integer
            median:
              type: integer
            percentile_75:
              type: integer
            percentile_90:
              type: integer
        dimension_comparisons:
          type: array
          items:
            type: object
            properties:
              dimension:
                type: string
              org_score:
                type: integer
              peer_median:
                type: integer

    SearchResults:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer
        results:
          type: array
          items:
            $ref: '#/components/schemas/OrganizationWithScore'

    ScoreHistoryEntry:
      type: object
      properties:
        total_score:
          type: integer
        dimension_scores:
          type: object
        calculated_at:
          type: string
          format: date-time
```

---

## UI Components

### Score Display Card

```tsx
interface TransparencyScoreCardProps {
  ein: string;
  name: string;
  city: string;
  state: string;
  totalScore: number;
  percentile: number;
  redFlagCount: number;
  isVerified: boolean;
  dimensions: {
    filingCurrency: { score: number; max: number };
    disclosureCompleteness: { score: number; max: number };
    governanceVisibility: { score: number; max: number };
    financialAccessibility: { score: number; max: number };
    redFlagAbsence: { score: number; max: number };
  };
}

function TransparencyScoreCard({ ... }: TransparencyScoreCardProps) {
  // Score color thresholds
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  // Score label
  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'High transparency';
    if (score >= 60) return 'Moderate transparency';
    if (score >= 40) return 'Low transparency';
    return 'Critical concerns';
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
          {/* Organization initials */}
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-sm text-gray-500">{city}, {state} · EIN {ein}</p>
        </div>
      </div>

      {/* Score display */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 uppercase mb-1">Public Score</p>
          <p className={`text-3xl font-semibold ${getScoreColor(totalScore)}`}>
            {totalScore}
          </p>
          <p className="text-xs text-gray-500">{getScoreLabel(totalScore)}</p>
        </div>
        
        {isVerified ? (
          <div className="flex-1 text-center p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 uppercase mb-1">Verified</p>
            <p className="text-3xl font-semibold text-green-600">✓</p>
            <p className="text-xs text-green-600">Real-time data</p>
          </div>
        ) : (
          <div className="flex-1 text-center p-4 bg-gray-50 rounded-lg border-dashed border-2">
            <p className="text-xs text-gray-400 uppercase mb-1">Verified</p>
            <p className="text-3xl font-semibold text-gray-300">—</p>
            <p className="text-xs text-gray-400">Not connected</p>
          </div>
        )}
      </div>

      {/* Dimension breakdown */}
      <div className="space-y-3">
        {Object.entries(dimensions).map(([key, { score, max }]) => (
          <DimensionBar 
            key={key}
            label={formatDimensionLabel(key)}
            score={score}
            max={max}
          />
        ))}
      </div>

      {/* Red flags */}
      {redFlagCount > 0 && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600 font-medium">
            {redFlagCount} red flag{redFlagCount > 1 ? 's' : ''} detected
          </p>
        </div>
      )}
    </div>
  );
}

function DimensionBar({ label, score, max }: { label: string; score: number; max: number }) {
  const percentage = (score / max) * 100;
  
  const getBarColor = (pct: number): string => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-32">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium w-12 text-right">{score}/{max}</span>
    </div>
  );
}
```

### Embeddable Widget

```html
<!-- Embed code for nonprofit websites -->
<div id="tallyview-score" data-ein="84-1234567"></div>
<script src="https://embed.tallyview.org/widget.js" async></script>

<!-- Widget renders as: -->
<div class="tallyview-widget">
  <div class="tallyview-score-badge">
    <span class="score">78</span>
    <span class="label">Transparency Score</span>
  </div>
  <a href="https://tallyview.org/org/84-1234567" target="_blank">
    View full report →
  </a>
  <img src="https://tallyview.org/badge/84-1234567.svg" alt="Tallyview Score: 78" />
</div>
```

### Widget JavaScript

```javascript
// embed.tallyview.org/widget.js
(function() {
  const containers = document.querySelectorAll('[data-tallyview-ein], #tallyview-score');
  
  containers.forEach(async (container) => {
    const ein = container.dataset.ein || container.dataset.tallyviewEin;
    if (!ein) return;
    
    try {
      const response = await fetch(`https://api.tallyview.org/v1/organizations/${ein}`);
      const data = await response.json();
      
      container.innerHTML = renderWidget(data);
    } catch (error) {
      container.innerHTML = '<p>Score unavailable</p>';
    }
  });
  
  function renderWidget(data) {
    const { name, transparency_score } = data;
    const { total, percentile } = transparency_score;
    
    const scoreColor = total >= 80 ? '#22c55e' : total >= 60 ? '#eab308' : '#ef4444';
    
    return `
      <div style="font-family: system-ui, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; max-width: 280px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: ${scoreColor}20; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 18px; font-weight: 600; color: ${scoreColor};">${total}</span>
          </div>
          <div>
            <p style="margin: 0; font-weight: 500; font-size: 14px;">Transparency Score</p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">${percentile}th percentile</p>
          </div>
        </div>
        <a href="https://tallyview.org/org/${data.ein}" target="_blank" rel="noopener" 
           style="display: block; text-align: center; font-size: 12px; color: #3b82f6; text-decoration: none;">
          View full report on Tallyview →
        </a>
        <p style="margin: 8px 0 0; font-size: 10px; color: #9ca3af; text-align: center;">
          Powered by Tallyview
        </p>
      </div>
    `;
  }
})();
```

---

## Implementation Checklist

### Phase 1: Data Pipeline (Weeks 1-2)

- [ ] Set up PostgreSQL database with schema
- [ ] Create IRS 990 data ingestion job
  - [ ] Download EO BMF extract
  - [ ] Download 990 e-file XMLs from AWS
  - [ ] Parse XML and populate organizations/filings tables
- [ ] Create compensation extraction job
- [ ] Set up daily/weekly sync schedule
- [ ] Build data quality monitoring

### Phase 2: Scoring Engine (Weeks 3-4)

- [ ] Implement filing currency calculation
- [ ] Implement disclosure completeness calculation
- [ ] Implement governance visibility calculation
- [ ] Implement financial accessibility calculation
- [ ] Implement red flag detection
- [ ] Build peer benchmarking system
- [ ] Create score calculation orchestrator
- [ ] Set up score recalculation schedule

### Phase 3: Website Checking (Week 5)

- [ ] Build website scraper with Puppeteer
- [ ] Implement document detection (990, audit, annual report)
- [ ] Implement policy detection (COI, whistleblower)
- [ ] Add rate limiting and retry logic
- [ ] Schedule periodic rechecks

### Phase 4: API Development (Weeks 6-7)

- [ ] Implement organization endpoints
- [ ] Implement search endpoint with filters
- [ ] Implement score detail endpoint
- [ ] Implement peer comparison endpoint
- [ ] Add authentication for rate limiting
- [ ] Write API documentation

### Phase 5: Frontend (Weeks 8-10)

- [ ] Build search interface
- [ ] Build organization detail page
- [ ] Build score breakdown visualization
- [ ] Build peer comparison charts
- [ ] Create embeddable widget
- [ ] Implement responsive design

### Phase 6: Launch Prep (Weeks 11-12)

- [ ] Load historical data (5+ years of 990s)
- [ ] Calculate scores for all organizations
- [ ] Performance optimization
- [ ] SEO setup (meta tags, sitemaps)
- [ ] Analytics integration
- [ ] Error monitoring setup

---

## Error Handling

### Missing Data

```python
def handle_missing_data(field: str, source: str) -> ScoringResult:
    """
    Handle cases where expected data is missing.
    
    Principle: Missing data should not inflate scores.
    Organizations don't get credit for things we can't verify.
    """
    
    missing_data_rules = {
        'filing': {
            'action': 'score_zero',
            'reason': 'No 990 filing found'
        },
        'website': {
            'action': 'score_zero_for_dimension',
            'dimension': 'financial_accessibility',
            'reason': 'Website not accessible'
        },
        'audit': {
            'action': 'neutral',
            'reason': 'Audit not required or not found'
        },
        'compensation': {
            'action': 'flag',
            'reason': 'Compensation data incomplete'
        }
    }
    
    return missing_data_rules.get(source, {'action': 'neutral'})
```

### Stale Data

```python
def check_data_freshness(organization: Organization) -> List[Warning]:
    """
    Warn when underlying data is stale.
    """
    warnings = []
    
    # 990 more than 2 years old
    if organization.latest_filing_year < current_year - 2:
        warnings.append(Warning(
            type='stale_filing',
            message=f'Most recent 990 is from {organization.latest_filing_year}',
            severity='high'
        ))
    
    # Website not checked in 30+ days
    if organization.last_website_check < today - timedelta(days=30):
        warnings.append(Warning(
            type='stale_website_check',
            message='Website data may be outdated',
            severity='low'
        ))
    
    return warnings
```

---

## Testing

### Unit Tests

```python
def test_filing_currency_on_time():
    """Test scoring for on-time 990 filing."""
    score = calculate_filing_currency(
        fiscal_year_end=date(2024, 6, 30),
        filing_date=date(2024, 11, 1),
        today=date(2025, 3, 1)
    )
    assert score == 25  # Filed within 5 months


def test_filing_currency_late():
    """Test scoring for late 990 filing."""
    score = calculate_filing_currency(
        fiscal_year_end=date(2024, 6, 30),
        filing_date=date(2025, 6, 1),
        today=date(2025, 7, 1)
    )
    assert score == 10  # Filed 11 months late


def test_compensation_outlier_detection():
    """Test CEO compensation percentile calculation."""
    peer_data = PeerBenchmarks(
        ntee_major='B',
        revenue_band='medium',
        ceo_comp_percentiles={
            50: 150000,
            75: 220000,
            90: 350000,
            95: 500000,
            99: 1000000
        }
    )
    
    # Normal compensation
    percentile = peer_data.get_compensation_percentile(180000)
    assert percentile < 95
    
    # Outlier compensation
    percentile = peer_data.get_compensation_percentile(750000)
    assert percentile >= 95


def test_red_flag_deductions():
    """Test that red flags properly deduct from score."""
    score, flags = calculate_red_flag_absence(
        filing=MockFiling(
            has_related_party_transactions=True,
            related_party_board_approval_documented=False
        ),
        audit_data=MockAudit(
            opinion_type='Qualified',
            material_weakness=True
        ),
        peer_data=None
    )
    
    # Should deduct: 5 (qualified) + 4 (material weakness) + 3 (related party) = 12
    assert score == 3
    assert len(flags) == 3
```

### Integration Tests

```python
def test_full_score_calculation():
    """Test end-to-end score calculation."""
    score = calculate_transparency_score('84-1234567')
    
    assert score.total_score >= 0
    assert score.total_score <= 100
    assert score.dimensions['filing_currency']['score'] <= 25
    assert score.dimensions['disclosure_completeness']['score'] <= 25
    assert score.dimensions['governance_visibility']['score'] <= 20
    assert score.dimensions['financial_accessibility']['score'] <= 15
    assert score.dimensions['red_flag_absence']['score'] <= 15
    
    # Sum of dimensions should equal total
    dimension_sum = sum(d['score'] for d in score.dimensions.values())
    assert dimension_sum == score.total_score


def test_api_organization_endpoint():
    """Test API returns valid organization data."""
    response = client.get('/v1/organizations/84-1234567')
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'ein' in data
    assert 'transparency_score' in data
    assert data['transparency_score']['total'] >= 0
    assert data['transparency_score']['total'] <= 100
```

---

## Monitoring & Alerts

### Key Metrics

```python
metrics_to_track = [
    # Data pipeline health
    'filings_ingested_daily',
    'filings_failed_parsing',
    'website_checks_completed',
    'website_checks_failed',
    
    # Score distribution
    'avg_score_all_orgs',
    'score_distribution_percentiles',
    'orgs_with_critical_flags',
    
    # API performance
    'api_requests_per_minute',
    'api_latency_p50',
    'api_latency_p99',
    'api_error_rate',
    
    # User engagement
    'unique_searches_daily',
    'org_detail_views',
    'embed_widget_loads'
]
```

### Alerts

```yaml
alerts:
  - name: filing_ingestion_failure
    condition: filings_failed_parsing > 100 in 1 hour
    severity: critical
    
  - name: score_calculation_backlog
    condition: pending_score_calculations > 10000
    severity: warning
    
  - name: api_error_spike
    condition: api_error_rate > 5% in 5 minutes
    severity: critical
    
  - name: website_check_failures
    condition: website_checks_failed > 50% in 1 hour
    severity: warning
```

---

## Future Enhancements

### Verified Score Integration

When organization connects accounting system:
1. Real-time data supplements/replaces 990 data
2. Filing currency dimension can score higher (data is current)
3. New dimensions unlock (cash position, restricted fund compliance)
4. Maximum achievable score increases from ~85 to 100

### Machine Learning Enhancements

- Fraud risk prediction model trained on Case Files data
- Anomaly detection across peer group
- Natural language analysis of Schedule O narratives
- Trend prediction for organizations at risk of score decline

### Additional Data Sources

- State AG complaint databases
- BBB Wise Giving Alliance data
- News sentiment analysis
- Social media reputation signals
