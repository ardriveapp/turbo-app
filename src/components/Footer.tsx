import { termsOfServiceUrl } from "../constants";

export function Footer() {
  return (
    <span id="version-footer">
      <a href={termsOfServiceUrl}>Terms</a> | v{import.meta.env.PACKAGE_VERSION}
    </span>
  );
}
