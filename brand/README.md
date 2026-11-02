<img src="./banners/stubble-paper/stubble-paper-github-readme-1280x320.png" alt="Stephen Walsh. Husband, father, software engineer, learner, leader." width="100%">

# Brand kit

Everything that makes me look like the same person on every site: the avatars, a banner for every profile header, the Movember posts, the SW monogram, colours, type and the words. All of it is built from source with a couple of commands, so nobody (me) has to nudge pixels in an image editor at 11pm.

## The looks

Same face, same hair, same glasses. Only the facial hair changes, and in November the flannel makes way for the hoodie. Pick whichever one matches the mirror.

| | Look | Key | When |
| --- | --- | --- | --- |
| <img src="./avatars/profile/stubble-paper-128.png" width="72" alt="Stephen with light stubble"> | Stubble | `stubble` | Most of the year. The default. |
| <img src="./avatars/profile/clean-paper-128.png" width="72" alt="Stephen clean shaven"> | Clean shaven | `clean` | Fresh shave, or 1 November before the mo gets going. |
| <img src="./avatars/profile/beard-paper-128.png" width="72" alt="Stephen with a short beard"> | Short beard | `beard` | Wisconsin winters. It's a warmth thing. |
| <img src="./avatars/profile/moustache-paper-128.png" width="72" alt="Stephen with a moustache, in a flannel"> | Moustache | `moustache` | The mo in everyday clothes. |
| <img src="./avatars/profile/movember-navy-128.png" width="72" alt="Stephen with a moustache, in the Movember hoodie"> | Movember | `movember` | The campaign look. Its banners carry the donate link and QR code. |

## What goes where

Swap `<look>` for one of the keys above and `<theme>` for `paper` (light) or `navy` (dark).

| Where | File |
| --- | --- |
| GitHub, Medium, Gravatar, NuGet and most other profile pictures | `avatars/profile/<look>-<theme>-512.png` |
| GitHub profile README | `banners/<look>-<theme>/<look>-<theme>-github-readme-1280x320.png` |
| LinkedIn banner | `banners/<look>-<theme>/<look>-<theme>-linkedin-1584x396.png` |
| X and Bluesky header | `banners/<look>-<theme>/<look>-<theme>-social-header-1500x500.png` |
| Link previews (Open Graph) | `banners/<look>-<theme>/<look>-<theme>-social-card-1200x630.png` |
| November, any of the above | `banners/movember/movember-<size>.png` |
| Facebook and Instagram in November | `movember-posts/` (no cartoon, just the ask and the QR code) |
| Anywhere else that needs the donate link | `movember-posts/movember-donate-qr.svg` |
| Website | `avatars/webp/`, `avatars/transparent/`, `logos/`, `tokens/tokens.css` |

LinkedIn, X and Bluesky park the profile photo over the bottom left of the banner, so those banners keep their words further to the right.

## Colours

| | Name | Hex | Used for |
| --- | --- | --- | --- |
| <img src="./tokens/swatches/paper.svg" width="24" alt=""> | Paper | `#F8F7F4` | Light background |
| <img src="./tokens/swatches/paperRaised.svg" width="24" alt=""> | Paper raised | `#ECEAE2` | The disc behind the avatar on paper |
| <img src="./tokens/swatches/ink.svg" width="24" alt=""> | Ink | `#181816` | Text on paper |
| <img src="./tokens/swatches/inkMuted.svg" width="24" alt=""> | Ink muted | `#5C5B57` | Secondary text on paper |
| <img src="./tokens/swatches/navy.svg" width="24" alt=""> | Navy | `#1A2238` | Dark background |
| <img src="./tokens/swatches/navyRaised.svg" width="24" alt=""> | Navy raised | `#222C47` | The disc behind the avatar on navy |
| <img src="./tokens/swatches/navyMuted.svg" width="24" alt=""> | Navy muted | `#A6B0C3` | Secondary text on navy |
| <img src="./tokens/swatches/movemberNavy.svg" width="24" alt=""> | Movember navy | `#0E1B2A` | November only |
| <img src="./tokens/swatches/rust.svg" width="24" alt=""> | Rust | `#8C4A32` | The tagline on paper. Borrowed from the flannel. |
| <img src="./tokens/swatches/rustOnDark.svg" width="24" alt=""> | Rust on dark | `#D69A78` | The tagline on navy |
| <img src="./tokens/swatches/blue.svg" width="24" alt=""> | Blue | `#3F6E9C` | Handle and links on paper |
| <img src="./tokens/swatches/blueOnDark.svg" width="24" alt=""> | Blue on dark | `#7CA9D4` | Handle and links on navy |

The same values live in [`tokens/tokens.json`](./tokens/tokens.json) (the build reads them from there) and [`tokens/tokens.css`](./tokens/tokens.css) (for the website, with light and dark themes). The JSON also holds the character palette, so any future redraw keeps the hair the same colour in every look. It took a while to get there.

## Type

- **Instrument Serif** for the name and headlines.
- **Inter** for everything else. The tagline is Inter SemiBold.
- **JetBrains Mono** for the `@stphnwlsh` handle.

All three are free under the SIL Open Font License. Copies of the fonts and their licences are in [`build/fonts/`](./build/fonts).

## Words

- **Name:** Stephen Walsh
- **Handle:** `@stphnwlsh` everywhere. No vowels were harmed; they just weren't invited.
- **LinkedIn headline:** Software Engineering Leader
- **Tagline:** Husband · Father · Software Engineer · Learner · Leader. On banners it splits after "Father".
- **GitHub bio:** Husband · Father · Software Engineer · Learner · Leader. Occasional moustache caretaker, long-suffering Liverpool fan.
- **Short bio:** Software engineering leader in Neenah, Wisconsin. I like solving problems and thinking about more than just the code.
- **Longer bio:** I'm a software engineer and engineering leader in Neenah, Wisconsin, by way of Australia. My favourite spot is where leading teams meets staying hands-on in the code: helping engineers grow while still caring about how the software is put together. In my spare time I tinker with [Lean Mean Clean Apps](https://leanmeancleanapps.github.io), a small family of `dotnet new` templates with a low-ceremony take on Clean Architecture. Outside of work I'm a husband and father first, a Movember regular (the moustache only visits in November) and a devoted Liverpool supporter.

## Movember

Donations go to [movember.com/m/stephenwalsh](https://movember.com/m/stephenwalsh). Every Movember banner and post carries that link and a QR code pointing at it. Before each November, bump `movemberYear` in `tokens/tokens.json` and rebuild.

## Rebuilding

New avatar art goes in `avatars/source/` as a 1024×1024 PNG on a flat, light background, named after its look. Then:

```bash
pip install pillow numpy opencv-python-headless fonttools
python3 brand/build/avatars.py               # transparent cut-outs, profile pictures, WebP
python3 brand/build/logos.py                 # SW monogram and favicon SVGs
cd brand/build && npm ci && npm run build    # banners, Movember posts, QR code, PNG icons
```

The build wipes and rewrites `banners/` and `movember-posts/`, so change the scripts or the tokens, not the PNGs.

## About the art

The cartoon me is an AI-assisted illustration, redrawn many, many times until the hair stopped changing colour between looks. The reference photos stay off the internet on purpose.
