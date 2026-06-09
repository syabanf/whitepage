import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { TEMPLATE_FIELDS, type ImageRef, type Section } from "@/lib/cms-client";
import { Input } from "@/components/ui/input";
import { ImagePicker } from "@/components/ImagePicker";
import { ColorField } from "@/components/ColorField";
import { BuilderShell } from "@/components/BuilderShell";
import { SaveButton } from "@/components/SaveButton";
import { SectionPalette } from "@/components/SectionPalette";
import { SectionFlash } from "@/components/SectionFlash";
import { UnsavedGuard } from "@/components/UnsavedGuard";

export interface BuilderActionSet {
  save: (formData: FormData) => void | Promise<void>;
  addSection: (templateKey: string, formData: FormData) => void | Promise<void>;
  moveSection: (sectionId: string, dir: "up" | "down", formData: FormData) => void | Promise<void>;
  removeSection: (sectionId: string, formData: FormData) => void | Promise<void>;
}

interface Props {
  kindLabel: string;
  title: string;
  slug: string | null;
  status: string;
  updatedAt: string;
  sections: Section[];
  seo: { title?: string | null; description?: string | null };
  tenantSlug: string;
  previewUrl: string;
  externalPreviewHref: string;
  backHref: string;
  backLabel: string;
  formId: string;
  actions: BuilderActionSet;
  slugHint?: string;
  saved?: boolean;
  removed?: boolean;
  /** Extra control in the header, before Save (e.g. a publish toggle). */
  headerExtra?: React.ReactNode;
  /** Extra panel rendered between SEO and Sections (e.g. an Articles list). */
  children?: React.ReactNode;
}

export function DocumentBuilder({
  kindLabel,
  title,
  slug,
  status,
  updatedAt,
  sections,
  seo,
  tenantSlug,
  previewUrl,
  externalPreviewHref,
  backHref,
  backLabel,
  formId,
  actions,
  slugHint = "URL path.",
  saved,
  removed,
  headerExtra,
  children
}: Props) {
  return (
    <main>
      <form action={actions.save} id={formId}>
        <UnsavedGuard formId={formId} />

        <section className="sticky top-0 z-20 border-b border-border bg-bg">
          <div className="flex w-full items-center justify-between gap-4 px-6 py-4 md:px-10">
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
            <div className="flex items-center gap-3">
              <a
                href={externalPreviewHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-border-emphasis bg-bg px-3 text-sm font-medium text-text transition-colors hover:border-brand hover:text-brand"
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Preview
              </a>
              {headerExtra}
              <SaveButton />
            </div>
          </div>
        </section>

        <BuilderShell previewUrl={previewUrl} version={updatedAt}>
          <div className="px-6 py-10 md:px-8 md:py-12">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">{kindLabel} builder</p>
                <h1 className="mt-2 text-h2 text-text">{title}</h1>
              </div>
              {saved && <Pill tone="success">Saved</Pill>}
              {removed && <Pill tone="muted">Section removed</Pill>}
            </div>

            <Card title={`${kindLabel} settings`}>
              <FieldRow label="Title" htmlFor="title" hint="Shown in browser tabs and used as the H1 default.">
                <Input id="title" name="title" defaultValue={title} required />
              </FieldRow>
              <FieldRow label="Slug" htmlFor="slug" hint={slugHint}>
                <Input id="slug" name="slug" defaultValue={slug ?? ""} placeholder="about" />
              </FieldRow>
            </Card>

            <Card title="SEO">
              <FieldRow label="Meta title" htmlFor="seo.title" hint="60-char target.">
                <Input id="seo.title" name="seo.title" defaultValue={seo?.title ?? ""} />
              </FieldRow>
              <FieldRow label="Meta description" htmlFor="seo.description" hint="155-char target.">
                <Textarea id="seo.description" name="seo.description" defaultValue={seo?.description ?? ""} />
              </FieldRow>
            </Card>

            {children}

            <div className="mt-12 mb-6 flex items-center justify-between">
              <h2 className="text-h3 text-text">Sections</h2>
              <span className="text-sm text-text-muted">{sections.length} on this {kindLabel.toLowerCase()}</span>
            </div>

            {sections.length === 0 ? (
              <p className="border border-dashed border-border bg-bg p-8 text-center text-sm text-text-muted">
                No sections yet. Add one from the palette below.
              </p>
            ) : (
              <div className="space-y-6">
                {sections.map((section, i) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    index={i}
                    total={sections.length}
                    tenantSlug={tenantSlug}
                    actions={actions}
                  />
                ))}
              </div>
            )}

            <SectionFlash sectionIds={sections.map((s) => s.id)} />

            <SectionPalette
              formId={formId}
              addSection={actions.addSection}
              templates={Object.entries(TEMPLATE_FIELDS).map(([key, s]) => ({
                key,
                category: s.category,
                label: s.label,
                description: s.description
              }))}
            />

            <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
              <p className="text-xs text-text-muted">
                Status: <span className="text-text">{status}</span> · Updated {new Date(updatedAt).toLocaleString()}
              </p>
              <SaveButton />
            </div>
          </div>
        </BuilderShell>
      </form>
    </main>
  );
}

function SectionEditor({
  section,
  index,
  total,
  tenantSlug,
  actions
}: {
  section: Section;
  index: number;
  total: number;
  tenantSlug: string;
  actions: BuilderActionSet;
}) {
  const schema = TEMPLATE_FIELDS[section.templateKey];

  return (
    <article id={`section-${section.id}`} className="relative scroll-mt-24 border border-border bg-bg">
      <div className="absolute right-3 top-3 z-[1] flex items-center gap-1">
        <IconButton label="Move up" disabled={index === 0} formAction={actions.moveSection.bind(null, section.id, "up")}>
          <ArrowUp className="h-4 w-4" />
        </IconButton>
        <IconButton label="Move down" disabled={index === total - 1} formAction={actions.moveSection.bind(null, section.id, "down")}>
          <ArrowDown className="h-4 w-4" />
        </IconButton>
        <IconButton label="Remove section" danger formAction={actions.removeSection.bind(null, section.id)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <details open className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-4 pr-28 [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-90" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Section {index + 1}</p>
            <h4 className="mt-0.5 text-base font-semibold text-text">{schema?.label ?? section.templateKey}</h4>
          </div>
        </summary>

        <div className="space-y-6 border-t border-border p-6 md:p-8">
          {!schema && (
            <p className="border border-border bg-surface p-3 text-xs text-text-muted">
              No editor schema for <code>{section.templateKey}</code>.
            </p>
          )}

          {schema?.textSlots.map((slot) => {
            const fieldName = `section.${section.id}.slot.${slot.name}`;
            const value = typeof section.slots[slot.name] === "string" ? (section.slots[slot.name] as string) : "";
            return (
              <FieldRow key={slot.name} label={slot.label} htmlFor={fieldName}>
                {slot.multiline ? (
                  <Textarea id={fieldName} name={fieldName} defaultValue={value} />
                ) : (
                  <Input id={fieldName} name={fieldName} defaultValue={value} />
                )}
              </FieldRow>
            );
          })}

          {schema?.imageSlots.map((slot) => {
            const raw = section.slots[slot.name];
            const initial = raw && typeof raw === "object" ? (raw as ImageRef) : null;
            return (
              <ImagePicker
                key={slot.name}
                name={`section.${section.id}.image.${slot.name}`}
                label={slot.label}
                tenantSlug={tenantSlug}
                initial={initial}
              />
            );
          })}

          {schema && schema.ctaSlots.length > 0 && (
            <div className="space-y-4">
              {schema.ctaSlots.map((cta) => {
                const obj =
                  section.slots[cta.name] && typeof section.slots[cta.name] === "object"
                    ? (section.slots[cta.name] as { label?: string; href?: string; style?: string; color?: string })
                    : {};
                const base = `section.${section.id}.cta.${cta.name}`;
                return (
                  <div key={cta.name} className="border border-border bg-surface p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">{cta.label}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FieldRow label="Label" htmlFor={`${base}.label`}>
                        <Input id={`${base}.label`} name={`${base}.label`} defaultValue={obj.label ?? ""} placeholder="Get started" />
                      </FieldRow>
                      <FieldRow label="Link" htmlFor={`${base}.href`}>
                        <Input id={`${base}.href`} name={`${base}.href`} defaultValue={obj.href ?? ""} placeholder="/contact" />
                      </FieldRow>
                      <FieldRow label="Button style" htmlFor={`${base}.style`}>
                        <Select id={`${base}.style`} name={`${base}.style`} defaultValue={obj.style ?? "solid"} options={["solid", "outline", "ghost"]} />
                      </FieldRow>
                      <div className="self-end">
                        <ColorField name={`${base}.color`} label="Button color" initial={obj.color} allowAlpha={false} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {schema && schema.variants.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {schema.variants.map((v) => {
                const fieldName = `section.${section.id}.variant.${v.name}`;
                const current =
                  typeof section.variants?.[v.name] === "string" ? (section.variants?.[v.name] as string) : v.options[0];
                return (
                  <FieldRow key={v.name} label={v.label} htmlFor={fieldName}>
                    <Select id={fieldName} name={fieldName} defaultValue={current} options={v.options} />
                  </FieldRow>
                );
              })}
            </div>
          )}

          <details className="border border-border bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
              Container style
            </summary>
            <div className="space-y-5 border-t border-border p-4">
              <ColorField name={`section.${section.id}.sstyle.bgColor`} label="Background color" initial={section.style?.bgColor} />
              <ColorField name={`section.${section.id}.sstyle.textColor`} label="Text color" initial={section.style?.textColor} allowAlpha={false} />
              <FieldRow label="Vertical padding" htmlFor={`section.${section.id}.sstyle.paddingY`}>
                <Select
                  id={`section.${section.id}.sstyle.paddingY`}
                  name={`section.${section.id}.sstyle.paddingY`}
                  defaultValue={section.style?.paddingY ?? ""}
                  options={["", "none", "sm", "md", "lg", "xl"]}
                />
              </FieldRow>
            </div>
          </details>
        </div>
      </details>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 border border-border bg-bg p-6 md:p-8">
      <h3 className="text-h3 text-text">{title}</h3>
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  hint,
  children
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className="block w-full rounded-md border border-border-emphasis bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2"
    />
  );
}

function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select
      {...props}
      className="block h-10 w-full rounded-md border border-border-emphasis bg-bg px-3 text-sm text-text focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function IconButton({
  label,
  children,
  disabled,
  danger,
  formAction
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  formAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-30 ${
        danger
          ? "border-border text-text-muted hover:border-danger hover:text-danger"
          : "border-border text-text-muted hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ tone, children }: { tone: "success" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "success" ? "border-success/40 bg-success/5 text-success" : "border-border-emphasis bg-surface text-text-muted";
  return <span className={`border px-3 py-1 text-xs uppercase tracking-wide ${cls}`}>{children}</span>;
}
