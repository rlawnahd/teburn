import HeroSection from './HeroSection';
import GradeShowcase from './GradeShowcase';
import PreviewSection from './PreviewSection';

export default function LandingPage() {
    return (
        <main className="min-h-screen">
            <HeroSection />
            <GradeShowcase />
            <PreviewSection />
        </main>
    );
}
