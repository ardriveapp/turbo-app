import { ArDriveLogo } from "./ArDriveLogo";

interface LogoHeaderProps {
  errorMessage?: string;
}
export function LogoHeader({ errorMessage }: LogoHeaderProps) {
  return (
    <>
      <ArDriveLogo />
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}
    </>
  );
}
