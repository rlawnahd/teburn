import HeroSection from './HeroSection';
import PhilosophyBanner from './PhilosophyBanner';
import PreviewSection from './PreviewSection';

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            <HeroSection />
            <PhilosophyBanner />
            <PreviewSection />
        </main>
    );
}
