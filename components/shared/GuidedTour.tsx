'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getTourForPersona } from '@/lib/data/tours';

interface GuidedTourProps {
  personaId: string | null;
}

const TOUR_COMPLETED_PREFIX = 'tallyview_tour_completed_';

export function GuidedTour({ personaId }: GuidedTourProps) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!personaId || hasRun.current) return;

    const storageKey = `${TOUR_COMPLETED_PREFIX}${personaId}`;
    try {
      if (localStorage.getItem(storageKey) === 'true') return;
    } catch {
      return;
    }

    const tour = getTourForPersona(personaId);
    if (!tour || tour.steps.length === 0) return;

    const timeout = setTimeout(() => {
      hasRun.current = true;
      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(15, 23, 42, 0.7)',
        popoverClass: 'tallyview-tour-popover',
        steps: tour.steps,
        onDestroyStarted: () => {
          try {
            localStorage.setItem(storageKey, 'true');
          } catch {}
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 1500);

    return () => clearTimeout(timeout);
  }, [personaId]);

  return null;
}
