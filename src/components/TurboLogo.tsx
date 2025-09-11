export default function TurboLogo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/turbo-logo.png" alt="Turbo" className="h-8 w-8" />
      <img src="/turbo-wordmark.png" alt="Turbo" className="h-6 hidden sm:block" />
    </div>
  );
}