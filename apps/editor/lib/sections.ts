import type { Section } from "@/lib/cms-client";

/**
 * Apply all field edits in a submitted builder form onto a section list.
 * Shared by web-page and article server actions. Field shapes:
 *   section.{id}.slot.{name}        → string slot
 *   section.{id}.image.{name}       → JSON image ref (or "" to clear)
 *   section.{id}.cta.{name}.{f}     → CTA label|href|style|color
 *   section.{id}.sstyle.{name}      → container bgColor|textColor|paddingY
 *   section.{id}.variant.{name}     → variant choice
 */
export function applyFormToSections(sections: Section[], formData: FormData): Section[] {
  return sections.map((section) => {
    const slots: Record<string, unknown> = { ...section.slots };
    const variants: Record<string, unknown> = { ...(section.variants ?? {}) };
    const style: Record<string, unknown> = { ...(section.style ?? {}) };

    formData.forEach((rawValue, key) => {
      const value = rawValue.toString();

      const slot = key.match(/^section\.([^.]+)\.slot\.(.+)$/);
      if (slot && slot[1] === section.id) {
        slots[slot[2]] = value;
        return;
      }

      const image = key.match(/^section\.([^.]+)\.image\.(.+)$/);
      if (image && image[1] === section.id) {
        if (value.trim() === "") {
          slots[image[2]] = null;
        } else {
          try {
            slots[image[2]] = JSON.parse(value);
          } catch {
            /* ignore malformed image json */
          }
        }
        return;
      }

      const cta = key.match(/^section\.([^.]+)\.cta\.([^.]+)\.(label|href|style|color)$/);
      if (cta && cta[1] === section.id) {
        const [, , ctaName, field] = cta;
        const existing =
          typeof slots[ctaName] === "object" && slots[ctaName] !== null
            ? (slots[ctaName] as Record<string, unknown>)
            : {};
        const next = { ...existing };
        if (value.trim() === "") delete next[field];
        else next[field] = value;
        if (!next.label && !next.href) delete slots[ctaName];
        else slots[ctaName] = next;
        return;
      }

      const sstyle = key.match(/^section\.([^.]+)\.sstyle\.(.+)$/);
      if (sstyle && sstyle[1] === section.id) {
        if (value.trim() === "") delete style[sstyle[2]];
        else style[sstyle[2]] = value;
        return;
      }

      const variant = key.match(/^section\.([^.]+)\.variant\.(.+)$/);
      if (variant && variant[1] === section.id) {
        variants[variant[2]] = value;
      }
    });

    return { ...section, slots, variants, style };
  });
}
