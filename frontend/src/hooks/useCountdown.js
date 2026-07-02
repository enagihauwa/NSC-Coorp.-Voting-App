import { useState, useEffect } from 'react';

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

const computeRemaining = (target) => {
  const diff = target - Date.now();
  if (diff <= 0) return ZERO;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
};

// Live countdown to a target time. `endTime` may be an ISO string, timestamp, or Date.
// Returns { days, hours, minutes, seconds, expired }. When `endTime` is falsy the
// countdown is inactive and reports expired.
const useCountdown = (endTime) => {
  const [remaining, setRemaining] = useState(() => {
    if (!endTime) return ZERO;
    return computeRemaining(new Date(endTime).getTime());
  });

  useEffect(() => {
    if (!endTime) {
      setRemaining(ZERO);
      return undefined;
    }
    const target = new Date(endTime).getTime();
    if (Number.isNaN(target)) {
      setRemaining(ZERO);
      return undefined;
    }
    setRemaining(computeRemaining(target));
    const interval = setInterval(() => {
      const next = computeRemaining(target);
      setRemaining(next);
      if (next.expired) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return remaining;
};

export default useCountdown;
