import { HeroCenteredMeta } from "./sections/HeroCentered.meta";
import { ImageFeatureMeta } from "./sections/ImageFeature.meta";
import { FAQAccordionMeta } from "./sections/FAQAccordion.meta";
import { CTABannerMeta } from "./sections/CTABanner.meta";
import { LeadFormHeroMeta } from "./sections/LeadFormHero.meta";
import type { TemplateRegistry } from "./types";

export const templateRegistry: TemplateRegistry = {
  [HeroCenteredMeta.key]: HeroCenteredMeta,
  [ImageFeatureMeta.key]: ImageFeatureMeta,
  [FAQAccordionMeta.key]: FAQAccordionMeta,
  [CTABannerMeta.key]: CTABannerMeta,
  [LeadFormHeroMeta.key]: LeadFormHeroMeta
};

export { HeroCenteredMeta, ImageFeatureMeta, FAQAccordionMeta, CTABannerMeta, LeadFormHeroMeta };
export type { TemplateMeta, TemplateRegistry, SectionData, SlotSchema, VariantChoice } from "./types";
