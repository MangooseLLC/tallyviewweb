# Nonprofit Fraud Typology Taxonomy

> Reference document for Tallyview's fraud detection engine, AnomalyRegistry categories, and Case Files research.
> Organized by ACFE Fraud Tree structure, adapted for nonprofit-specific schemes and financial data detectability.

---

## Category 1: Asset Misappropriation

Direct theft or misuse of organizational assets. The most common fraud category by incident count, though often smaller dollar amounts than corruption or financial statement fraud.

---

### 1.1 Cash Theft / Skimming

**Definition:** Stealing cash donations or revenue before they are recorded in the accounting system.

**Common Schemes:**
- Pocketing cash donations at events or collection points
- Skimming from program fees paid in cash
- Theft from petty cash funds
- Unrecorded cash sales (merchandise, tickets)

**Financial Signature:**
- Revenue per event/program lower than comparable organizations
- Donation trends inconsistent with donor counts or event attendance
- Cash-to-check ratio anomalies compared to sector benchmarks
- Petty cash replenishment frequency or amounts that don't match activity levels

**Detection Methodology:**
- Peer benchmarking: revenue per attendee, donation per donor
- Trend analysis: sudden drops in cash-based revenue streams
- Ratio analysis: cash donations vs. check/electronic donations over time
- Event analysis: reported revenue vs. ticket sales, attendance estimates

**Data Requirements:**
- Transaction-level revenue data with payment method
- Event attendance or program participation records (often not in accounting system)
- Peer organization revenue data for benchmarking

**Detection Difficulty:** Hard — requires external data (attendance, peer benchmarks) that may not be in accounting system. Skimming leaves no direct trail.

**Related 990 Lines:** Part VIII (Revenue), Schedule G (Fundraising Events)

---

### 1.2 Credit Card / T&E Abuse

**Definition:** Personal expenses charged to organizational credit cards or submitted as fraudulent reimbursements.

**Common Schemes:**
- Personal purchases on corporate cards
- Inflated or fabricated expense reports
- Duplicate reimbursement requests
- Personal travel charged as business travel
- Gift card purchases for personal use
- Fuel cards used for personal vehicles

**Financial Signature:**
- Expense patterns that don't match role or program activities
- Weekend/holiday purchases inconsistent with operations
- Merchant categories misaligned with mission (luxury retail, entertainment, personal services)
- Round-number expense claims
- Duplicate amounts across time periods
- Expense spikes before employee departures
- Card activity during PTO or leave periods

**Detection Methodology:**
- Merchant category analysis: flag personal-use merchants
- Temporal analysis: weekend, holiday, after-hours transactions
- Duplicate detection: same amounts, same merchants, similar dates
- Benford's Law analysis on expense amounts
- Per-employee expense trending
- Comparison to policy limits and peer benchmarks

**Data Requirements:**
- Credit card transaction detail (merchant, category, date, amount)
- Employee role and department mapping
- Travel and expense policy parameters
- Calendar/leave data (if available)

**Detection Difficulty:** Medium — strong transaction-level signals, but requires credit card feeds (not just GL summaries). Very common fraud type.

**Related 990 Lines:** Part IX (Functional Expenses), Schedule J (Compensation)

---

### 1.3 Check Tampering / Unauthorized Disbursements

**Definition:** Forging, altering, or misappropriating checks or electronic payments.

**Common Schemes:**
- Forged signatures on checks
- Altered payee names after signing
- Unauthorized ACH or wire transfers
- Duplicate check runs to same vendor
- Checks written to "Cash" without documentation
- Voided checks that were actually cashed

**Financial Signature:**
- Checks to unfamiliar payees or addresses
- Disbursements outside normal approval thresholds
- Sequential check numbers with gaps (voided checks)
- Payments to vendors with no corresponding goods/services
- Unusual payment timing (month-end, year-end, during vacations)
- ACH/wire transfers to new accounts

**Detection Methodology:**
- Payee analysis: new payees, payees matching employee names/addresses
- Sequence analysis: check number gaps, voided check patterns
- Threshold analysis: payments just below approval limits
- Timing analysis: disbursements during controller/CFO absence
- Bank reconciliation anomalies

**Data Requirements:**
- Check register with payee, amount, check number
- Bank statement data for reconciliation
- Approval workflow data (if available)
- Employee address list for matching

**Detection Difficulty:** Medium — clear signals in disbursement data, but requires check-level detail and bank reconciliation access.

**Related 990 Lines:** Part IX (Functional Expenses)

---

### 1.4 Ghost Employee / Payroll Fraud

**Definition:** Payments to fictitious employees or manipulation of payroll for personal gain.

**Common Schemes:**
- Fictitious employees on payroll
- Terminated employees kept on payroll
- Inflated hours for hourly workers
- Unauthorized pay rate changes
- Commission manipulation
- Payroll directed to personal accounts
- Duplicate payroll records

**Financial Signature:**
- Employees with no activity in other systems (email, badge, timekeeping)
- Payroll addresses or bank accounts matching other employees
- Pay rates outside normal bands for position
- Sudden increases in headcount without corresponding program growth
- Payroll as percentage of revenue anomalies vs. peers
- Direct deposits to same account for multiple employees

**Detection Methodology:**
- Headcount reconciliation: payroll records vs. HR records vs. badge/system access
- Address/account matching across employees
- Pay rate benchmarking by position
- Payroll-to-revenue ratio trending
- Terminated employee audit: last day worked vs. last paycheck
- Ghost detection: employees with payroll but no other system activity

**Data Requirements:**
- Payroll register with employee ID, pay rate, hours, bank routing (last 4)
- HR roster with hire/term dates
- Badge access or system login data (if available)
- Position/role classifications

**Detection Difficulty:** Medium — payroll data usually available, but ghost detection requires cross-referencing multiple systems.

**Related 990 Lines:** Part IX (Compensation), Schedule J (Compensation of Officers)

---

### 1.5 Fictitious Vendor Schemes

**Definition:** Creating fake companies or vendors to submit fraudulent invoices.

**Common Schemes:**
- Shell companies owned by employee or family member
- Invoices for goods/services never delivered
- Inflated invoices from complicit vendors
- PO box or mail drop addresses
- Vendors with no online presence or business registration

**Financial Signature:**
- Vendor addresses matching employee addresses
- Vendors with only PO box addresses
- New vendors with immediate high-volume activity
- Round-number invoices
- Invoices just below approval thresholds
- Vendors with no W-9 or incomplete documentation
- Single-service vendors (only one type of charge, ever)
- Vendor names similar to legitimate vendors (typosquatting)

**Detection Methodology:**
- Address matching: vendor addresses vs. employee addresses
- Vendor validation: business registration lookup, online presence check
- Invoice pattern analysis: round numbers, threshold gaming, timing
- Vendor concentration: high spend with minimal vendor documentation
- New vendor velocity: rapid spend ramp-up after onboarding
- Service verification: cross-reference invoiced services with operational records

**Data Requirements:**
- Vendor master file with addresses, tax IDs
- Employee address list
- Invoice detail with amounts, dates, descriptions
- Business registration database access (for validation)

**Detection Difficulty:** Medium — strong signals available, but requires vendor master data and address matching logic.

**Related 990 Lines:** Part IX (Functional Expenses), Schedule I (Grants)

---

### 1.6 Inventory / Asset Theft

**Definition:** Theft of physical inventory, equipment, or supplies.

**Common Schemes:**
- Theft of donated goods before recording
- Equipment "lost" or "damaged" but actually taken
- Supplies ordered for personal use
- Inventory write-offs without verification
- Asset disposal without proper sale proceeds

**Financial Signature:**
- Inventory shrinkage rates above industry benchmarks
- High equipment replacement frequency
- Supply costs per program out of line with peers
- Asset disposal with no or below-market proceeds
- Write-offs concentrated around specific employees or locations

**Detection Methodology:**
- Shrinkage analysis: book vs. physical inventory
- Asset lifecycle analysis: acquisition to disposal patterns
- Benchmarking: supply costs per beneficiary served
- Write-off audit: concentration by approver, location, timing

**Data Requirements:**
- Fixed asset register
- Inventory records (if applicable)
- Disposal/write-off documentation
- Program metrics for per-unit analysis

**Detection Difficulty:** Hard — requires physical inventory data that most accounting systems don't track well. Better suited for audit than automated detection.

**Related 990 Lines:** Part X (Balance Sheet — inventory, fixed assets)

---

## Category 2: Corruption / Self-Dealing

Schemes involving conflicts of interest, bribery, or improper influence. Often larger dollar amounts than asset misappropriation. Central to nonprofit accountability because board/executive self-dealing violates fiduciary duty.

---

### 2.1 Procurement Steering

**Definition:** Directing contracts or purchases to favored vendors without proper competition.

**Common Schemes:**
- Specifications written to favor a specific vendor
- Splitting purchases to avoid bid thresholds
- Sole-source justifications for competitive items
- Rush orders that bypass procurement process
- Bid evaluation criteria manipulated post-submission

**Financial Signature:**
- Repeated sole-source awards to same vendor
- Purchase amounts clustered just below bid thresholds
- Vendor consistently wins competitive bids
- Higher prices than market rates for comparable goods/services
- Rush/emergency purchases concentrated with certain approvers

**Detection Methodology:**
- Threshold analysis: purchase clustering below competitive bid limits
- Vendor win rate analysis: same vendor repeatedly selected
- Price benchmarking: compare to market rates, GSA schedules, peer spending
- Sole-source audit: frequency, justification patterns, vendor concentration
- Split purchase detection: multiple small orders vs. single large order

**Data Requirements:**
- Purchase order and invoice data with vendor, amount, date
- Procurement policy thresholds
- Market rate benchmarks or peer spending data
- Bid documentation (if available)

**Detection Difficulty:** Medium — spend data usually available; threshold gaming and vendor concentration are detectable patterns.

**Related 990 Lines:** Part IX (Functional Expenses), Schedule L (Transactions with Interested Persons)

---

### 2.2 Vendor Concentration / Sole Source Abuse

**Definition:** Excessive reliance on a single vendor, creating opportunities for inflated pricing or self-dealing.

**Common Schemes:**
- Single vendor dominates a spend category without justification
- Long-term contracts renewed without re-competition
- Vendor relationships that predate key employee's tenure (brought vendor from prior job)
- Escalating spend with single vendor over time

**Financial Signature:**
- High percentage of category spend with single vendor
- Vendor concentration increasing over time
- Prices above market without documented justification
- Vendor relationship correlated with specific employee's tenure
- No competitive alternatives evaluated

**Detection Methodology:**
- Concentration index: percentage of spend by category with top vendor
- Trend analysis: vendor share increasing over time
- Market comparison: prices vs. benchmarks
- Correlation analysis: vendor onboarding timing vs. employee hire dates
- Contract duration analysis: renewals without re-bid

**Data Requirements:**
- Spend data by vendor and category
- Contract/PO history with dates
- Employee hire dates
- Market rate benchmarks

**Detection Difficulty:** Low-Medium — concentration is directly calculable from spend data. One of the easiest fraud indicators to detect.

**Related 990 Lines:** Part IX (Functional Expenses), Schedule L (Transactions with Interested Persons)

---

### 2.3 Board/Vendor Conflict of Interest

**Definition:** Board members or executives have undisclosed financial relationships with vendors.

**Common Schemes:**
- Board member owns or has interest in vendor company
- Executive's family member employed by vendor
- Board member receives consulting fees from vendor
- Hidden ownership through LLCs or trusts
- Quid pro quo: board member's company gets nonprofit's business

**Financial Signature:**
- Vendor addresses or registered agents matching board/executive addresses
- Vendor onboarded shortly after board member joins
- Favorable terms compared to market
- No competitive bidding for services vendor provides
- Vendor name similar to board member's known businesses

**Detection Methodology:**
- Entity matching: vendor names/addresses vs. board/executive disclosed interests
- Timing analysis: vendor relationship start vs. board tenure
- Related party disclosure audit: compare 990 Schedule L to actual vendor list
- Corporate registry lookup: vendor ownership vs. board/executive names
- Network analysis: shared addresses, registered agents, corporate officers across entities

**Data Requirements:**
- Board roster with disclosed business interests
- Vendor master with addresses, ownership info
- 990 Schedule L disclosures
- Corporate registry data (Secretary of State filings)

**Detection Difficulty:** Medium — requires entity resolution and network analysis. Schedule L disclosures help but are often incomplete.

**Related 990 Lines:** Part VI (Governance), Schedule L (Transactions with Interested Persons)

---

### 2.4 Related Party Transactions

**Definition:** Business dealings between the nonprofit and parties with close relationships to insiders.

**Common Schemes:**
- Leasing property from board member at above-market rates
- Purchasing services from executive's family business
- Loans to/from officers or directors
- Grants to organizations where insiders have roles
- Employment of family members at inflated salaries

**Financial Signature:**
- Payments to entities matching insider names or addresses
- Lease rates above market for comparable properties
- Service contracts without competitive procurement
- Loans on favorable terms vs. market rates
- Employment clustering of related individuals

**Detection Methodology:**
- Name/address matching across insider list and vendor/payee list
- Market rate comparison for leases, services, loans
- Family name clustering in payroll
- Grant recipient board overlap analysis
- Disclosure completeness: compare actual transactions to Schedule L

**Data Requirements:**
- Insider list (officers, directors, key employees, their families)
- Vendor and payee master files
- Lease agreements and property records
- Loan documentation
- Grant recipient information

**Detection Difficulty:** Medium — requires comprehensive insider list and entity matching capability.

**Related 990 Lines:** Part VI (Governance), Schedule L (Transactions with Interested Persons)

---

### 2.5 Kickback Schemes

**Definition:** Vendor pays employee or board member in exchange for business.

**Common Schemes:**
- Cash payments to decision-maker
- Gifts, travel, entertainment from vendor
- Consulting fees to insider's separate company
- Deferred compensation or job offers
- Benefits to family members (scholarships, jobs, contracts)

**Financial Signature:**
- Vendor with consistently favorable treatment despite higher prices
- Employee lifestyle indicators inconsistent with salary
- Employee's side business receiving payments from nonprofit's vendors
- Vendor entertainment expenses spiking around contract awards
- Unusual vendor credits or adjustments

**Detection Methodology:**
- Price benchmarking: consistent overpayment to specific vendor
- Lifestyle analysis: public records indicating wealth inconsistent with salary
- Side business detection: employee business interests receiving vendor payments
- Contract-award timing analysis: vendor spending patterns around bid dates
- Vendor financial analysis: margin anomalies on nonprofit contracts

**Data Requirements:**
- Spend data with vendor detail
- Market rate benchmarks
- Employee conflict-of-interest disclosures
- Public records (property, corporate filings)
- Vendor financial data (usually not available)

**Detection Difficulty:** Hard — the payment flows outside the nonprofit's accounting system. Requires external data or behavioral analysis.

**Related 990 Lines:** Part VI (Governance), Schedule L (Transactions with Interested Persons)

---

### 2.6 Bid Rigging / Collusion

**Definition:** Coordination among vendors to manipulate competitive bidding.

**Common Schemes:**
- Complementary bidding (competitors submit intentionally high bids)
- Bid rotation (vendors take turns winning)
- Market allocation (vendors divide territories or customers)
- Subcontracting to losing bidders

**Financial Signature:**
- Bid amounts suspiciously close or following patterns
- Same vendors consistently participate in bids
- Winning vendor subcontracts to losing bidder
- Prices don't decrease despite multiple bidders
- Bid withdrawals that favor specific vendor

**Detection Methodology:**
- Bid pattern analysis: price clustering, rotation patterns
- Bidder network analysis: same companies repeatedly bidding together
- Subcontract analysis: winner subcontracting to losers
- Price trend analysis: prices stable despite competition
- Bid withdrawal timing: withdrawals benefiting specific bidders

**Data Requirements:**
- Bid documentation with all submitted prices
- Contract award history
- Subcontract records
- Market price benchmarks

**Detection Difficulty:** Hard — requires bid-level documentation that's rarely in accounting systems. Better suited for procurement audit than transaction monitoring.

**Related 990 Lines:** Part IX (Functional Expenses)

---

### 2.7 Grant Steering / Favoritism

**Definition:** Directing grants to favored recipients based on relationships rather than merit.

**Common Schemes:**
- Grants to organizations where board members have roles
- Grants to executives' family members' organizations
- Evaluation criteria manipulated to favor specific applicants
- Rushed grant cycles that limit competition
- Repeated grants to same organizations without review

**Financial Signature:**
- Grant recipients with board overlap
- Grants to organizations at same addresses as insiders
- Single grantee receiving disproportionate share
- Grants without documented evaluation process
- Grantee outcomes not commensurate with funding

**Detection Methodology:**
- Board overlap analysis: grantee boards vs. grantor boards
- Address matching: grantee addresses vs. insider addresses
- Concentration analysis: grant dollars by recipient
- Outcome benchmarking: grantee results vs. funding level
- Process audit: documentation completeness for awards

**Data Requirements:**
- Grant recipient list with addresses, board members
- Grantor board/staff list
- Grant amounts and purposes
- Outcome reporting (if available)

**Detection Difficulty:** Medium — requires grantee information beyond just payment records.

**Related 990 Lines:** Schedule I (Grants and Other Assistance), Schedule L (Transactions with Interested Persons)

---

## Category 3: Financial Statement / Reporting Fraud

Manipulation of financial records or reports to deceive stakeholders. Often involves covering up other fraud types or misrepresenting organizational health.

---

### 3.1 Executive Compensation Manipulation

**Definition:** Understating, hiding, or mischaracterizing executive compensation.

**Common Schemes:**
- Compensation not reported on 990
- Benefits excluded from reported totals
- Payments routed through related entities
- Deferred compensation not disclosed
- Personal expenses classified as business expenses
- Loans to executives forgiven or not repaid

**Financial Signature:**
- Reported compensation below peer benchmarks for similar-sized organizations
- High "other expenses" or professional fees without detail
- Payments to entities matching executive names/addresses
- Executive lifestyle inconsistent with reported salary
- Loans to officers with no repayment activity

**Detection Methodology:**
- Peer benchmarking: compensation vs. similar orgs by revenue/mission
- Ratio analysis: total comp as percentage of revenue
- Related party payment analysis: payments to entities linked to executives
- Loan monitoring: officer loans with aging analysis
- Total compensation reconstruction: salary + benefits + payments to related entities

**Data Requirements:**
- 990 Schedule J data
- Peer compensation benchmarks (GuideStar, Candid)
- Payment records to potential related entities
- Officer loan records

**Detection Difficulty:** Medium — 990 disclosures provide baseline; detection requires peer benchmarking and entity matching.

**Related 990 Lines:** Part VII (Compensation), Schedule J (Compensation of Officers)

---

### 3.2 Expense Misclassification

**Definition:** Categorizing expenses incorrectly to hide their nature or improve financial ratios.

**Common Schemes:**
- Personal expenses coded as business expenses
- Fundraising costs classified as program expenses
- Executive perks hidden in general categories
- Capital expenditures expensed to reduce net assets
- Expenses shifted between fiscal years

**Financial Signature:**
- Expense category ratios that deviate from peers
- Vague or catch-all expense categories with large balances
- Expense timing anomalies around fiscal year-end
- Categories that don't match operational activities

**Detection Methodology:**
- Category ratio analysis: compare to peer benchmarks
- Trend analysis: sudden changes in expense category ratios
- Year-end analysis: expense acceleration or deferral patterns
- Granular review: large transactions in vague categories

**Data Requirements:**
- Expense data by category
- Peer expense ratio benchmarks
- Transaction-level detail for anomaly investigation

**Detection Difficulty:** Medium — ratio analysis is straightforward; determining if misclassification is fraud vs. error requires investigation.

**Related 990 Lines:** Part IX (Statement of Functional Expenses)

---

### 3.3 Functional Expense Manipulation

**Definition:** Misallocating expenses among program, management/general, and fundraising to improve overhead ratios.

**Common Schemes:**
- Management salaries allocated primarily to program
- Fundraising costs classified as program outreach
- Overhead expenses embedded in program costs
- Joint cost allocations that overstate program share
- Administrative staff time charged entirely to programs

**Financial Signature:**
- Overhead ratios significantly better than peers
- Program expense ratio inconsistent with program activities
- Joint cost allocation percentages that seem unrealistic
- Administrative staff with 100% program allocation
- Fundraising ratio suspiciously low despite active solicitation

**Detection Methodology:**
- Peer benchmarking: functional expense ratios vs. similar organizations
- Allocation reasonableness: joint cost percentages, staff allocation methodology
- Correlation analysis: fundraising spend vs. contribution revenue
- Trend analysis: sudden improvements in overhead ratios

**Data Requirements:**
- Functional expense breakdown (program/management/fundraising)
- Peer ratio benchmarks
- Staff allocation records (if available)
- Joint cost allocation methodology documentation

**Detection Difficulty:** Low-Medium — ratio analysis is straightforward; this is one of the most common and detectable nonprofit-specific frauds.

**Related 990 Lines:** Part IX (Statement of Functional Expenses)

---

### 3.4 Restricted Fund Diversion

**Definition:** Using donor-restricted funds for unauthorized purposes.

**Common Schemes:**
- Spending restricted gifts on general operations
- Borrowing from restricted funds without documentation
- Reclassifying restricted funds as unrestricted
- Ignoring time restrictions on multi-year grants
- Commingling restricted and unrestricted cash

**Financial Signature:**
- Restricted fund balances declining without corresponding program activity
- Cash flow that doesn't match restricted fund movements
- Restricted revenue increasing but restricted net assets flat or declining
- Program expenses inconsistent with restricted fund purposes

**Detection Methodology:**
- Fund balance tracking: restricted fund balances over time
- Program alignment: restricted fund purposes vs. actual program spending
- Cash reconciliation: bank balances vs. sum of fund balances
- Grant compliance: spending timelines vs. grant requirements

**Data Requirements:**
- Fund balance detail (restricted, temporarily restricted, unrestricted)
- Grant/gift documentation with restrictions
- Program expense allocation by fund
- Cash position by fund

**Detection Difficulty:** Medium — requires fund accounting detail that not all organizations track well.

**Related 990 Lines:** Part X (Balance Sheet — net assets), Part XI (Reconciliation of Net Assets)

---

### 3.5 Grant Funding Commingling

**Definition:** Mixing grant funds with other revenue in ways that obscure proper use or enable diversion.

**Common Schemes:**
- Multiple grants deposited to single bank account with no tracking
- Grant funds used as working capital
- Overhead charged to grants without proper allocation
- Grant funds covering unallowable expenses
- Matching fund requirements met with ineligible expenses

**Financial Signature:**
- Bank accounts that don't reconcile to fund balances
- Grant expenses that exceed grant awards
- Overhead rates charged to grants above approved rates
- Grant expenditure timing inconsistent with grant periods

**Detection Methodology:**
- Fund-to-bank reconciliation: fund balances vs. dedicated accounts
- Grant-to-expense matching: award amounts vs. charged expenses by grant
- Overhead rate analysis: charged rates vs. approved rates
- Timing analysis: expenses before award or after grant period

**Data Requirements:**
- Grant award documentation with approved budgets/rates
- Expense allocation by grant
- Bank account mapping to funds
- Grant period dates

**Detection Difficulty:** Medium — requires grant-level tracking that varies widely by organization sophistication.

**Related 990 Lines:** Schedule D (Supplemental Financial Statements), Part IX (Functional Expenses)

---

### 3.6 Program Service Inflation / Outcome Fraud

**Definition:** Overstating program activities, beneficiaries served, or outcomes achieved.

**Common Schemes:**
- Inflated beneficiary counts on grant reports
- Fabricated program outcomes or impact metrics
- Double-counting participants across programs
- Claiming outcomes for activities that didn't occur
- Overstating geographic reach or service area

**Financial Signature:**
- Cost per beneficiary significantly below peers
- Staffing ratios that can't support claimed service levels
- Program outcomes improving while costs decline
- Travel/facility expenses inconsistent with claimed reach
- Volunteer hours that seem implausible

**Detection Methodology:**
- Unit cost analysis: cost per beneficiary, cost per outcome
- Staffing ratio analysis: FTEs vs. claimed service levels
- Trend anomalies: outcomes improving faster than investment
- Correlation analysis: expense patterns vs. claimed activities
- Peer benchmarking: service metrics vs. similar organizations

**Data Requirements:**
- Program metrics (beneficiaries, outcomes, activities)
- Expense data allocated to programs
- Staffing data by program
- Peer service delivery benchmarks

**Detection Difficulty:** Hard — requires program data beyond financials; often only detectable through site visits or detailed grant reporting review.

**Related 990 Lines:** Part III (Statement of Program Service Accomplishments)

---

### 3.7 In-Kind Donation Fraud

**Definition:** Overvaluing donated goods or services to inflate revenue or provide tax benefits.

**Common Schemes:**
- Donated goods valued above fair market value
- Services valued at retail rather than cost
- Phantom donations (recorded but never received)
- Related party donations at inflated values
- Donation date manipulation for tax purposes

**Financial Signature:**
- In-kind revenue significantly higher than peers
- In-kind donations from related parties
- Valuation documentation missing or inconsistent
- In-kind as percentage of total revenue anomalous
- Timing of in-kind donations clustered around year-end

**Detection Methodology:**
- Valuation benchmarking: in-kind values vs. fair market comparables
- Related party analysis: in-kind donors vs. insider list
- Ratio analysis: in-kind as percentage of total revenue vs. peers
- Documentation audit: appraisals, receipts, valuation methodology

**Data Requirements:**
- In-kind donation records with valuations
- Donor information
- Valuation documentation
- Peer in-kind revenue benchmarks

**Detection Difficulty:** Medium — requires valuation data and peer benchmarks; some schemes detectable through ratio analysis alone.

**Related 990 Lines:** Part VIII (Revenue — noncash contributions), Schedule M (Noncash Contributions)

---

### 3.8 Revenue Recognition Manipulation

**Definition:** Improperly timing or categorizing revenue to present a misleading financial picture.

**Common Schemes:**
- Recording multi-year pledges as current revenue
- Recognizing conditional grants before conditions met
- Backdating or forward-dating revenue
- Classifying contributions as exchange transactions (or vice versa)
- Creating fictitious revenue entries

**Financial Signature:**
- Revenue spikes at period-end
- Pledges receivable growing faster than collections
- Revenue recognition patterns inconsistent with grant terms
- Large year-end adjustments or restatements
- Revenue-to-cash flow mismatches

**Detection Methodology:**
- Timing analysis: revenue recognition patterns around period-end
- Pledge analysis: receivables aging vs. collection history
- Grant matching: revenue recognition vs. grant performance timelines
- Cash flow analysis: operating cash vs. reported revenue

**Data Requirements:**
- Revenue by source and timing
- Pledges receivable with aging
- Grant documentation with performance requirements
- Cash flow statements

**Detection Difficulty:** Medium — requires understanding revenue recognition rules and access to receivables detail.

**Related 990 Lines:** Part VIII (Statement of Revenue), Part X (Balance Sheet)

---

### 3.9 Liability Concealment

**Definition:** Hiding or understating obligations to present stronger financial position.

**Common Schemes:**
- Not recording accounts payable
- Pension or benefit obligations understated
- Loan covenants violated but not disclosed
- Contingent liabilities not disclosed
- Related party debt not reported

**Financial Signature:**
- Payables turnover ratios that seem implausibly fast
- Pension funding status inconsistent with plan obligations
- Debt covenants likely violated based on financial ratios
- Large payments shortly after year-end
- Related party transactions with no corresponding liability

**Detection Methodology:**
- Payables analysis: turnover ratios, timing patterns
- Subsequent payments review: large payments after period-end
- Covenant testing: financial ratios vs. disclosed covenants
- Pension funding analysis: assets vs. obligations
- Related party liability matching: transactions vs. recorded debt

**Data Requirements:**
- Accounts payable detail
- Debt agreements with covenants
- Pension/benefit plan documents
- Subsequent period disbursements

**Detection Difficulty:** Hard — requires detailed liability information often not available in standard accounting feeds.

**Related 990 Lines:** Part X (Balance Sheet — liabilities), Schedule D (Supplemental Financial Statements)

---

### 3.10 Documentation Fabrication / Backdating

**Definition:** Creating false records or altering documents to support fraudulent transactions or cover up misconduct.

**Common Schemes:**
- Backdating contracts or approvals
- Fabricating invoices or receipts
- Forging signatures on authorizations
- Altering bank statements or reconciliations
- Creating false board minutes or resolutions
- Fabricating donor acknowledgments

**Financial Signature:**
- Document metadata inconsistent with stated dates
- Approvals dated after transactions occurred
- Invoice numbers out of sequence
- Document formatting inconsistent with vendor's historical invoices
- Missing original documents (only copies available)

**Detection Methodology:**
- Metadata analysis: document creation dates vs. stated dates
- Sequence analysis: invoice/PO numbers vs. chronological order
- Consistency analysis: document formatting, signatures, letterhead
- Approval timing: authorization dates vs. transaction dates
- Cross-reference verification: confirm documents with third parties

**Data Requirements:**
- Document images with metadata
- Transaction dates for comparison
- Historical documents for consistency comparison
- Third-party confirmation access

**Detection Difficulty:** Hard — requires document-level analysis beyond transaction data. More suited for investigation than automated detection.

**Related 990 Lines:** Part VI (Governance — document retention policy)

---

## Detection Priority Matrix

Organized by detection difficulty and frequency to guide Tallyview AI engine development priorities.

### Tier 1: High Frequency, Detectable from Standard Accounting Data

| Fraud Type | Detection Difficulty | Primary Signals |
|------------|---------------------|-----------------|
| Vendor Concentration | Low | Spend concentration by vendor/category |
| Functional Expense Manipulation | Low-Medium | Ratio analysis vs. peers |
| Procurement Steering | Medium | Threshold clustering, sole-source patterns |
| Credit Card / T&E Abuse | Medium | Merchant analysis, temporal patterns |
| Executive Compensation Manipulation | Medium | Peer benchmarking, related party payments |
| Expense Misclassification | Medium | Category ratio deviation |

### Tier 2: Moderate Frequency, Requires Enhanced Data

| Fraud Type | Detection Difficulty | Primary Signals |
|------------|---------------------|-----------------|
| Ghost Employee / Payroll Fraud | Medium | Cross-system reconciliation |
| Fictitious Vendor Schemes | Medium | Address matching, vendor validation |
| Board/Vendor Conflict of Interest | Medium | Entity resolution, network analysis |
| Related Party Transactions | Medium | Insider list matching |
| Restricted Fund Diversion | Medium | Fund balance tracking |
| Grant Funding Commingling | Medium | Grant-to-expense matching |
| In-Kind Donation Fraud | Medium | Valuation benchmarking |
| Revenue Recognition Manipulation | Medium | Timing analysis, cash flow matching |

### Tier 3: Lower Frequency or Requires External Data

| Fraud Type | Detection Difficulty | Primary Signals |
|------------|---------------------|-----------------|
| Cash Theft / Skimming | Hard | Peer benchmarking, event analysis |
| Check Tampering | Medium | Disbursement pattern analysis |
| Kickback Schemes | Hard | Price benchmarking, lifestyle indicators |
| Bid Rigging | Hard | Bid documentation analysis |
| Program Service Inflation | Hard | Unit cost analysis, staffing ratios |
| Liability Concealment | Hard | Subsequent payment analysis |
| Documentation Fabrication | Hard | Document metadata analysis |
| Inventory / Asset Theft | Hard | Physical inventory reconciliation |
| Grant Steering | Medium | Board overlap analysis |

---

## Mapping to AnomalyRegistry Categories

Current `AnomalyCategory` enum values and recommended updates:

| Current Enum Value | Fraud Types Covered | Notes |
|-------------------|---------------------|-------|
| `FinancialHealth` | Liability concealment, revenue manipulation | Keep |
| `Governance` | Documentation gaps, process failures | Keep |
| `FraudPattern` | General catch-all | Consider deprecating or making more specific |
| `CompensationOutlier` | Executive compensation manipulation | Keep |
| `VendorConcentration` | Vendor concentration, procurement steering | Keep |
| `ExpenseAllocation` | Expense misclassification, functional expense manipulation | Rename to `ExpenseClassification` |
| `RevenueAnomaly` | Revenue recognition manipulation, in-kind fraud | Keep |
| `RelatedParty` | Board/vendor conflict, related party transactions, grant steering | Keep |
| `DocumentProvenance` | Documentation fabrication | Keep as control weakness indicator |
| `Custom` | Extension point | Keep |

### Recommended Additions:

| Proposed Enum Value | Fraud Types Covered |
|---------------------|---------------------|
| `PayrollAnomaly` | Ghost employees, payroll fraud |
| `DisbursementAnomaly` | Check tampering, unauthorized disbursements |
| `TravelExpense` | Credit card / T&E abuse |
| `RestrictedFunds` | Restricted fund diversion, grant commingling |
| `VendorValidity` | Fictitious vendor schemes |
| `AssetMisappropriation` | Inventory theft, cash skimming |

---

## Data Requirements Summary

### Minimum Viable Detection (Tier 1 frauds):
- General ledger transactions with account coding
- Vendor master file (name, address, tax ID)
- Payee detail on disbursements
- 990 data (Part VII, IX, Schedule J, Schedule L)
- Peer benchmarks (revenue, compensation, expense ratios)

### Enhanced Detection (Tier 2 frauds):
- Employee roster with addresses, hire/term dates
- Board/officer list with disclosed interests
- Fund balance detail (restricted vs. unrestricted)
- Grant award documentation
- Credit card transaction detail (merchant, category)

### Comprehensive Detection (Tier 3 frauds):
- Bank statement data
- Bid documentation
- Document images with metadata
- Physical inventory records
- Program metrics (beneficiaries, outcomes)
- External data (corporate registries, property records)

---

## Case Files Research Priorities

Based on this taxonomy, prioritize Case Files research to document real-world examples of:

1. **Functional expense manipulation** — extremely common, often not prosecuted, perfect for demonstrating detection methodology
2. **Vendor concentration leading to self-dealing** — clear financial signature, frequent in corruption cases
3. **Executive compensation schemes** — high visibility, strong peer benchmarking signals
4. **Restricted fund diversion** — devastating to donor trust, often discovered late
5. **Fictitious vendor schemes** — dramatic when discovered, clear prevention methods
6. **Credit card abuse** — most common fraud type, relatable to general audience

Each Case File should document:
- The scheme (what happened)
- The financial signature (what the data showed)
- The control failure (what allowed it)
- The detection method (how it was caught or could have been caught)
- The resolution (legal/organizational outcome)

---

*Document version: 1.0*
*Last updated: March 2026*
*For internal Tallyview use: fraud detection engine development, Case Files research, AnomalyRegistry contract design*
