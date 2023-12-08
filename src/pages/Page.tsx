import { useErrorMessage } from "../hooks/useErrorMessage";
import { LogoHeader } from "../components/LogoHeader";
import "./Page.css";
import { ErrMsgCallback } from "../types";
import { Footer } from "../components/Footer";

interface PageProps {
  page: (errorCallback: ErrMsgCallback) => JSX.Element;
}

export function Page({ page }: PageProps) {
  const [errorMessage, errorCallback] = useErrorMessage();

  return (
    <>
      <LogoHeader errorMessage={errorMessage} />
      {page(errorCallback)}
      <Footer />
    </>
  );
}
