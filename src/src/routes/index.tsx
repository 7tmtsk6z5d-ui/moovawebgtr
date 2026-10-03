import { createFileRoute } from "@tanstack/react-router";
import { AboutSection } from "@/components/about-section";
import { FlavorMenu } from "@/components/flavor-menu";
import { FloatingWa } from "@/components/floating-wa";
import { HeroStage } from "@/components/hero-stage";
import { OrderDrawer } from "@/components/order-drawer";
import { PaySection } from "@/components/pay-section";
import { ReviewsSection } from "@/components/reviews-section";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="bg-cream text-ink">
      <HeroStage />
      <FlavorMenu />
      <AboutSection />
      <ReviewsSection />
      <PaySection />
      <SiteFooter />
      <OrderDrawer />
      <FloatingWa />
    </main>
  );
}
