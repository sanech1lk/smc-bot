import SmoothScroll from "@/components/providers/SmoothScroll";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { Navbar } from "@/components/sections/Navbar";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Story } from "@/components/sections/Story";
import { Showcase } from "@/components/sections/Showcase";
import { Compare } from "@/components/sections/Compare";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { Cta } from "@/components/sections/Cta";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <ScrollProgress />
      <Navbar />
      <main id="main">
        <Hero />
        <Stats />
        <Story />
        <Showcase />
        <Compare />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
