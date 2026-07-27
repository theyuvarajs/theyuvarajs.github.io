// ============================================================
// RENDERER
// This is the single renderer mentioned throughout the README:
// renderKnowledgeItem() renders any article from any sheet the
// same way. There is no renderNotes()/renderCommands()/renderProcess()
// — content differences are handled entirely by renderBlock()
// switching on the AST node's `type`, not on which sheet it came from.
// ============================================================

import { el } from "../utils/dom.js";
import { renderInline, renderParagraphs } from "../utils/markdown.js";
import { renderCodeBlock } from "../components/codeblock.js";
import { renderMarkdownTable } from "../components/table.js";

const CALLOUT_META = {
  note: { icon: "ℹ️", label: "Note" },
  tip: { icon: "💡", label: "Tip" },
  warning: { icon: "⚠️", label: "Warning" },
  quote: { icon: "❝", label: null }
};

function renderBlock(node) {
  switch (node.type) {
    case "description":
      return el("div", { class: "block block-description", html: renderParagraphs(node.text) });

    case "checklist":
      return renderChecklist(node.items);

    case "process":
      return el("div", { class: "block process" }, node.children.map(renderBlock));

    case "step":
      return el("div", { class: "step" }, [
        el("div", { class: "step-marker" }),
        el("div", { class: "step-body" }, node.children.map(renderBlock))
      ]);

    case "command":
      return renderCodeBlock({ code: node.code, isCommand: true });

    case "code":
      return renderCodeBlock({ code: node.code, language: node.language });

    case "note":
    case "tip":
    case "warning":
    case "quote":
      return renderCallout(node);

    case "image":
      return el("figure", { class: "block img-block" }, [el("img", { src: node.url, alt: node.alt, loading: "lazy" })]);

    case "video":
      return renderVideo(node.url);

    case "table":
      return el("div", { class: "block" }, [renderMarkdownTable(node.raw)]);

    case "details":
      return renderDetails(node);

    default:
      return null; // unrecognized/empty block — silently skipped
  }
}

function renderChecklist(items) {
  return el(
    "ul",
    { class: "block checklist" },
    items.map((text) => {
      const inputId = "chk-" + Math.random().toString(36).slice(2, 9);
      return el("li", {}, [
        el("input", { type: "checkbox", id: inputId }),
        el("label", { for: inputId, html: renderInline(text) })
      ]);
    })
  );
}

function renderCallout(node) {
  const meta = CALLOUT_META[node.type];
  const body = node.text != null
    ? el("div", { class: "callout__body", html: renderParagraphs(node.text) })
    : el("div", { class: "callout__body" }, node.children.map(renderBlock));

  const children = [];
  if (meta.label) children.push(el("div", { class: "callout__label" }, [`${meta.icon} ${meta.label}`]));
  children.push(body);

  return el("div", { class: `block callout callout--${node.type}` }, children);
}

function renderVideo(url) {
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  const media = youtubeMatch
    ? el("iframe", { src: `https://www.youtube.com/embed/${youtubeMatch[1]}`, allowfullscreen: "true", frameborder: "0" })
    : el("video", { src: url, controls: "true" });
  return el("div", { class: "block video-block" }, [media]);
}

function renderDetails(node) {
  const details = document.createElement("details");
  details.className = "block details-block";
  details.appendChild(el("summary", { html: renderInline(node.summary) }));
  details.appendChild(el("div", { class: "details-body" }, node.children.map(renderBlock)));
  return details;
}

/** The single renderer: any KnowledgeItem, from any sheet, renders through here. */
export function renderKnowledgeItem(item, kb) {
  const header = el("header", { class: "article-header" }, [
    el("div", { class: "article-meta" }, [
      el("a", { class: "article-section", href: `#section:${item.sectionSlug}` }, [item.section]),
      el("span", { class: "article-id" }, [item.id])
    ]),
    el("h1", {}, [item.title]),
    item.tags.length
      ? el("div", { class: "tag-row" }, item.tags.map((t) => el("a", { class: "tag", href: `#tag:${encodeURIComponent(t)}` }, [t])))
      : null
  ]);

  const body = el("div", { class: "article-body" }, item.ast.map(renderBlock).filter(Boolean));

  const article = el("article", { class: "article" }, [header, body]);

  const relatedItems = item.related.map((id) => kb.items.get(id)).filter(Boolean);
  if (relatedItems.length) {
    article.appendChild(
      el("div", { class: "related-block" }, [
        el("h3", {}, ["Related Articles"]),
        el(
          "div",
          { class: "related-list" },
          relatedItems.map((r) =>
            el("a", { class: "related-chip", href: `#${r.id}` }, [
              el("span", { class: "related-chip__id" }, [r.id]),
              el("span", { class: "related-chip__title" }, [r.title])
            ])
          )
        )
      ])
    );
  }

  return article;
}

/** Home page: an overview grid of sections. */
export function renderHome(kb, mount) {
  mount.innerHTML = "";
  mount.appendChild(
    el("div", { class: "home" }, [
      el("h1", {}, ["Knowledge Base"]),
      el("p", { class: "home-sub" }, [`${kb.list.length} article${kb.list.length === 1 ? "" : "s"} across ${kb.sections.length} section${kb.sections.length === 1 ? "" : "s"}.`]),
      el(
        "div",
        { class: "section-grid" },
        kb.sections.map((s) =>
          el("a", { class: "section-card", href: `#section:${s.slug}` }, [
            el("h3", {}, [s.name]),
            el("span", { class: "count-pill" }, [`${s.count} article${s.count === 1 ? "" : "s"}`])
          ])
        )
      )
    ])
  );
}

/** Section or tag browsing view: a grid of article cards. */
export function renderList(title, items, mount) {
  mount.innerHTML = "";
  mount.appendChild(
    el("div", { class: "article-list-page" }, [
      el("h1", {}, [title]),
      el("p", { class: "home-sub" }, [`${items.length} article${items.length === 1 ? "" : "s"}`]),
      items.length
        ? el(
            "div",
            { class: "card-grid" },
            items.map((i) =>
              el("a", { class: "article-card", href: `#${i.id}` }, [
                el("div", { class: "article-card__meta" }, [el("span", { class: "article-id" }, [i.id]), el("span", {}, [i.section])]),
                el("h3", {}, [i.title]),
                i.tags.length ? el("div", { class: "tag-row" }, i.tags.slice(0, 4).map((t) => el("span", { class: "tag" }, [t]))) : null
              ])
            )
          )
        : el("div", { class: "empty-state" }, ["Nothing here yet."])
    ])
  );
}

/** Not-found view for an unknown article ID. */
export function renderNotFound(id, mount) {
  mount.innerHTML = "";
  mount.appendChild(
    el("div", { class: "error-state" }, [el("h2", {}, ["Article not found"]), el("p", {}, [`No article with ID "${id}".`]), el("a", { href: "#" }, ["← Back to home"])])
  );
}
