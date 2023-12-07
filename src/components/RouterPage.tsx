import { LogoHeader } from "./LogoHeader";

interface RouterPageProps {
  page: JSX.Element;
  errorMessage?: string;
}

export function RouterPage({ page, errorMessage }: RouterPageProps) {
  return (
    <>
      <LogoHeader errorMessage={errorMessage} />
      {page}
    </>
  );
}
