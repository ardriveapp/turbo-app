import { useState, useEffect } from 'react';

interface Company {
  name: string;
  url: string;
  logo: string;
  description: string;
}

interface CompanyCarouselProps {
  companies: Company[];
}

export function CompanyCarousel({ companies }: CompanyCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % companies.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [companies.length]);

  // Handle touch gestures for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      setCurrentSlide((prev) => (prev + 1) % companies.length);
    }
    if (distance < -minSwipeDistance) {
      setCurrentSlide((prev) => (prev - 1 + companies.length) % companies.length);
    }
  };

  return (
    <div className="carousel-wrapper relative">
      <div
        className="overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Mobile: 1 column */}
        <div
          className="carousel-container flex md:hidden"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {companies.map((company, index) => (
            <div key={`${company.name}-${index}`} className="w-full flex-shrink-0 px-4">
              <a
                href={company.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card rounded-2xl border border-border/20 p-6 text-center hover:border-primary/30 transition-all group block h-full"
              >
                <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <img src={company.logo} alt={company.name} className="w-16 h-16 object-contain" />
                </div>
                <div className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {company.name}
                </div>
                <div className="text-base text-foreground/80 leading-relaxed">
                  {company.description}
                </div>
              </a>
            </div>
          ))}
        </div>

        {/* Desktop: 3 columns */}
        <div
          className="carousel-container hidden md:flex"
          style={{ transform: `translateX(-${currentSlide * (100 / 3)}%)` }}
        >
          {companies.map((company, index) => (
            <div key={`${company.name}-${index}`} className="w-1/3 flex-shrink-0 px-3">
              <a
                href={company.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card rounded-2xl border border-border/20 p-6 text-center hover:border-primary/30 transition-all group block h-full"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain" />
                </div>
                <div className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {company.name}
                </div>
                <div className="text-sm text-foreground/80">
                  {company.description}
                </div>
              </a>
            </div>
          ))}

          {/* Duplicate first few items for seamless loop */}
          {companies.slice(0, 3).map((company, index) => (
            <div key={`${company.name}-duplicate-${index}`} className="w-1/3 flex-shrink-0 px-3">
              <a
                href={company.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-card rounded-2xl border border-border/20 p-6 text-center hover:border-primary/30 transition-all group block h-full"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <img src={company.logo} alt={company.name} className="w-12 h-12 object-contain" />
                </div>
                <div className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {company.name}
                </div>
                <div className="text-sm text-foreground/80">
                  {company.description}
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center mt-6 gap-3">
        {companies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`relative p-2 transition-all duration-300 ${
              index === currentSlide % companies.length
                ? 'scale-110'
                : 'hover:scale-105'
            }`}
          >
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentSlide % companies.length
                ? 'bg-primary w-6'
                : 'bg-primary/30 hover:bg-primary/50'
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default CompanyCarousel;
