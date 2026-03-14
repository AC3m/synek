import { stravaAssets } from '~/assets/strava';

interface StravaLogoProps {
  className?: string;
}

export function StravaLogo({ className = 'h-5 w-auto' }: StravaLogoProps) {
  return (
    <>
      <img
        src={stravaAssets.poweredByStravaOrangeUrl}
        alt="Powered by Strava"
        className={`${className} dark:hidden`}
      />
      <img
        src={stravaAssets.poweredByStravaWhiteUrl}
        alt="Powered by Strava"
        className={`${className} hidden dark:block`}
      />
    </>
  );
}
