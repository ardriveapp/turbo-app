export default function TurboLogo() {
  return (
    <div className="flex items-center gap-3">
      <img src="/turbo-logo.png" alt="Turbo" className="h-10 w-10" />
      <img src="/turbo-wordmark.png" alt="Turbo" className="h-7 hidden sm:block" />
    </div>
  );
}