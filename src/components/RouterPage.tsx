import { termsOfServiceUrl } from "../constants";
import { LogoHeader } from "./LogoHeader";
import "./RouterPage.css";

interface RouterPageProps {
  page: JSX.Element;
  errorMessage?: string;
}

export function RouterPage({ page, errorMessage }: RouterPageProps) {
  return (
    <>
      <LogoHeader errorMessage={errorMessage} />
      {page}
      <span id="version-footer">
        <a href={termsOfServiceUrl}>Terms</a> | v
        {import.meta.env.PACKAGE_VERSION}
      </span>
    </>
  );
}
