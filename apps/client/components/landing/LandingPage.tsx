import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PreviewSection from './PreviewSection';

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            <HeroSection />
            <FeaturesSection />
            <PreviewSection />
        </main>
    );
}
