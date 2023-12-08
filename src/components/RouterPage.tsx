import { termsOfServiceUrl } from "../constants";
import { useErrorMessage } from "../hooks/useErrorMessage";
import { LogoHeader } from "./LogoHeader";
import "./RouterPage.css";

interface PageProps {
  page: (errorCallback: (message: string) => void) => JSX.Element;
}

export function Page({ page }: PageProps) {
  const [errorMessage, errorCallback] = useErrorMessage();

  return (
    <>
      <LogoHeader errorMessage={errorMessage} />
      {page(errorCallback)}
      <span id="version-footer">
        <a href={termsOfServiceUrl}>Terms</a> | v
        {import.meta.env.PACKAGE_VERSION}
      </span>
    </>
  );
}
