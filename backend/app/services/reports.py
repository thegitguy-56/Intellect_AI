import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor("#4338CA")
MUTED = colors.HexColor("#464554")


def _styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            "ReportTitle", parent=base["Title"], textColor=PRIMARY, fontSize=22, spaceAfter=4
        )
    )
    base.add(
        ParagraphStyle(
            "SectionHeading", parent=base["Heading2"], textColor=PRIMARY, spaceBefore=18, spaceAfter=8
        )
    )
    base.add(ParagraphStyle("Body", parent=base["BodyText"], textColor=colors.HexColor("#181445")))
    base.add(ParagraphStyle("Muted", parent=base["BodyText"], textColor=MUTED, fontSize=9))
    return base


def generate_pdf(patent: dict, analysis: dict | None, entities: list[dict], prior_art: list[dict], sections: list[str]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )
    styles = _styles()
    story = []

    story.append(Paragraph("IntellectFlow — Patent Analysis Report", styles["ReportTitle"]))
    story.append(Paragraph(patent.get("title", "Untitled Patent"), styles["Muted"]))
    story.append(Spacer(1, 16))

    if "summary" in sections and analysis:
        story.append(Paragraph("Summary", styles["SectionHeading"]))
        story.append(
            Paragraph((analysis.get("abstract_text") or "No abstract extracted.")[:2000], styles["Body"])
        )
        score_rows = [
            ["Novelty Score", _fmt_score(analysis.get("novelty_score"))],
            ["Risk Score", _fmt_score(analysis.get("risk_score"))],
            ["Compliance Score", _fmt_score(analysis.get("compliance_score"))],
        ]
        table = Table(score_rows, colWidths=[2.5 * inch, 2 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
                    ("TEXTCOLOR", (1, 0), (1, -1), PRIMARY),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E5E1")),
                ]
            )
        )
        story.append(Spacer(1, 8))
        story.append(table)

    if "entities" in sections and entities:
        story.append(Paragraph("Extracted Entities", styles["SectionHeading"]))
        rows = [["Type", "Value"]] + [
            [e["entity_type"].capitalize(), e["entity_value"][:80]] for e in entities[:40]
        ]
        table = Table(rows, colWidths=[1.5 * inch, 4 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#E5E5E1")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(table)

    if "prior_art" in sections and prior_art:
        story.append(Paragraph("Prior-Art Matches", styles["SectionHeading"]))
        rows = [["Title", "Similarity"]] + [
            [p["title"][:70], f"{p['similarity_score']:.0%}"] for p in prior_art[:15]
        ]
        table = Table(rows, colWidths=[4.5 * inch, 1 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY),
                    ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY),
                    ("LINEBELOW", (0, 1), (-1, -1), 0.5, colors.HexColor("#E5E5E1")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(table)

    if "risk_compliance" in sections and analysis:
        story.append(Paragraph("Risk & Compliance", styles["SectionHeading"]))
        story.append(
            Paragraph(
                f"Risk score: {_fmt_score(analysis.get('risk_score'))} / 100. "
                f"Compliance score: {_fmt_score(analysis.get('compliance_score'))} / 100.",
                styles["Body"],
            )
        )

    if "recommendations" in sections and analysis:
        story.append(Paragraph("Recommendations", styles["SectionHeading"]))
        story.append(
            Paragraph(
                "See the Innovation Recommendation view in the app for the full "
                "gap analysis and opportunity mapping generated for this patent.",
                styles["Body"],
            )
        )

    doc.build(story)
    return buffer.getvalue()


def _fmt_score(value) -> str:
    if value is None:
        return "—"
    return f"{value:.0f}"
