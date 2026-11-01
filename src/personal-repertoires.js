import courses from './personal-opening-data.json' with { type: 'json' };

export const STUDY_PACK = 'leonbede-2026-10-v3-en';
export const personalRepertoires = courses;

export function studyCoursePgn(course) {
  const clean = (text) => text.replace(/["\\\r\n]/g, ' ');
  return course.lessons
    .map(
      (l) =>
        `[Event "${clean(l.title)}"]\n[Opening "${clean(l.title)}"]\n[Annotator "Potez study notes"]\n[Source "${l.source || course.sources[0]}"]\n${l.fen ? `[SetUp "1"]\n[FEN "${clean(l.fen)}"]\n` : ''}${l.prompt ? `[PotezPrompt "${clean(l.prompt)}"]\n` : ''}${l.kind ? `[PotezKind "${clean(l.kind)}"]\n` : ''}${l.origin ? `[PotezOrigin "${clean(l.origin)}"]\n` : ''}${l.verification ? `[PotezVerification "${clean(l.verification)}"]\n` : ''}[Result "*"]\n\n${l.moves} {Plan: ${l.plan}} *`,
    )
    .join('\n\n');
}
