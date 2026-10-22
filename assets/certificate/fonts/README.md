Fonts embedded in certificate PDFs (src/lib/certificate-pdf.ts). All four
families are released under the SIL Open Font License 1.1
(https://openfontlicense.org), which allows embedding and redistribution.

- Cormorant Garamond (Christian Thalmann, Catharsis Fonts)
- Space Grotesk (Florian Karsten)
- Inter (Rasmus Andersson)
- Noto Serif (Google), only as a fallback for letters Cormorant lacks

Latin and Latin Extended subsets (WOFF), copied from the @fontsource packages.
Names and course titles fall back to other files, in the order listed in
src/lib/certificate-fonts.ts, for letters such as ɛ, ɔ and ŋ. Profile names are
checked against these files before they are saved, so every name can be printed
exactly as typed.
