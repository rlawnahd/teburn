import HeroSection from './HeroSection';
import PhilosophyBanner from './PhilosophyBanner';
import FeaturesSection from './FeaturesSection';
import PreviewSection from './PreviewSection';

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            <HeroSection />
            <PhilosophyBanner />
            <FeaturesSection />
            <PreviewSection />
        </main>
    );
}
