"use client";

import React, { useCallback, useMemo, useState } from "react";

type BellNotifyProps = {
  isOn?: boolean;
  onToggle?: (next: boolean) => void;
  /** Base size in px; all pieces scale from this. */
  size?: number;
  baseColor?: string;
  rotationAmplitude?: number;
  showButton?: boolean;
  buttonLabel?: string;
  onButtonClick?: () => void;
  disableToggle?: boolean;
  className?: string;
};

const CSS = `
.bell-root{position:relative;width:100%;height:100%;display:grid;place-items:center;}
.bell-root *{transition:filter .4s ease-in-out,box-shadow .4s ease-in-out,opacity .4s ease-in-out,color .4s ease-in-out,background .4s ease-in-out,text-shadow .4s ease-in-out;}
.bell-container,.bell-container *{position:absolute;left:0;right:0;top:0;bottom:0;margin:auto;}
.bell-container{width:80em;height:80em;cursor:pointer;transform-origin:50% -50vh;animation:bellsway 5s ease-in-out infinite;outline:none;}
@keyframes bellsway{0%{rotate:calc(1deg * var(--degofrot))}50%{rotate:calc(-1deg * var(--degofrot))}100%{rotate:calc(1deg * var(--degofrot))}}
.bell-root .rope{height:50vh;width:2em;translate:0 -52%;background:linear-gradient(90deg,#2d54744d 0%,#000b 30%,transparent 100%),repeating-linear-gradient(-70deg,#252525,#888 2%,#3a3a3a 3%);}
.bell-root .bell-top{width:14%;height:14%;border-radius:50%;translate:0 -28em;background:var(--base-clr);box-shadow:inset -1em -.5em 2em .5em #fff,inset 1em -1em 2em 3em #000,0 -.1em .4em .3em #c6eaffa8;}
.bell-root .bell-base{width:50%;height:50%;border-radius:50%;overflow:hidden;translate:0 -24%;background:var(--base-clr);box-shadow:0 -.1em .4em .2em #c6eaffa8;}
.bell-root .bell-base:before{content:'';background-image:radial-gradient(circle at -80% -12%,transparent 50em,var(--base-clr) 50em);position:absolute;translate:-18em 20em;width:100%;height:80%;}
.bell-root .bell-base:after{content:'';background-image:radial-gradient(circle at 180% -12%,transparent 50.1em,#cacaca 50.3em,var(--base-clr) 50.5em);position:absolute;translate:18em 20em;width:100%;height:80%;}
.bell-root .bell-base:nth-of-type(3){filter:brightness(3) blur(1em);scale:.74 .84;translate:0 -11em;}
.bell-root .shadow-l1{width:30em;height:42em;border-radius:50%;rotate:12deg;translate:-3em -6em;filter:blur(2em);background:#797a80;}
.bell-root .shadow-l2{width:130%;height:90%;filter:blur(5em);translate:-6em 9em;}
.bell-root .shadow-l2::before{display:block;content:'';width:68%;height:64%;border-radius:50%;rotate:-54deg;translate:-8em 2em;background:#000;}
.bell-root .glow{width:100%;height:100%;filter:brightness(2) blur(2em);}
.bell-root .glow2{width:100%;height:100%;filter:blur(.3em);opacity:.1;}
.bell-root .left-glow{width:50%;height:50%;border-radius:50%;translate:0 -24%;box-shadow:inset 1em 0 1em .2em #5d819666;clip-path:polygon(0 0,100% 0,100% 50%,0 50%);}
.bell-root .left-glow2{width:49%;height:50%;background-image:radial-gradient(circle at -80% -12%,transparent 50em,#5d819666 50.3em,transparent 52em);translate:-19em 10.35em;clip-path:polygon(0 0,100% 0,100% 78%,0 78%);}
.bell-root .r-glow{width:50%;height:50%;border-radius:50%;translate:0 -24%;box-shadow:inset 1em 0 1em .2em #fffaf680;clip-path:polygon(0 0,100% 0,100% 50%,0 50%);transform:rotateY(180deg);}
.bell-root .r-glow2{width:49%;height:50%;background-image:radial-gradient(circle at -80% -12%,transparent 50em,#fffaf680 50.3em,transparent 52em);translate:18.2em 10.35em;clip-path:polygon(0 0,100% 0,100% 78%,0 78%);transform:rotateY(180deg) rotateZ(-2deg);}
.bell-root .mid-ring{width:64%;height:10%;border-radius:50%;translate:-.1em 10em;box-shadow:inset -.3em 1.3em .4em -1em #fff5,-.2em -1.2em .4em -.4em #505050,-.1em -1.8em .4em -.4em #fff5,0 -2.5em .4em -1em #000;mix-blend-mode:hard-light;filter:brightness(.8);}
.bell-root .mid-ring.small{translate:.04em -8em;scale:.8 .5;}
.bell-root .mid-ring::before,.bell-root .mid-ring::after{content:'';display:block;background:#000;width:2em;height:2em;top:10%;border-radius:50%;position:absolute;}
.bell-root .mid-ring::after{right:-2%}.bell-root .mid-ring::before{left:-2%}
.bell-root .bell-buff-t{background:#fff2;width:72%;height:12%;border-radius:50%;translate:0 16em;filter:blur(1em);}
.bell-root .bell-buff{background:linear-gradient(90deg,black 40%,var(--base-clr) 90%);width:88%;height:20%;border-radius:50% 50% 50% 50%/50% 50% 30% 30%;translate:0 20em;box-shadow:inset 1em 0 2em -1em #5d819666,inset -1em 0 2em -1em #fff;}
.bell-root .bell-btm{width:88%;height:18%;border-radius:50%;translate:0 23em;background:linear-gradient(90deg,black 40%,var(--base-clr) 90%);}
.bell-root .bell-btm2{width:74%;height:12%;border-radius:50%;translate:0 24em;background:#fffff6;box-shadow:0 0 1em .6em #ffe9d4,-.8em .2em 2em 1em #cca37f,-5.4em -.6em 3em -1em #ce6e1abb,6em -.6em 3em -1em #ce6e1abb,inset 0 30.3em .3em -30em #c7962d,inset 0 -2em 2em -2em #ffe9d4,inset 0 -1em 2em 1em #ce6e1a66;}
.bell-root .off .bell-btm2{filter:brightness(.02);}
.bell-root .bell-ring-container{width:74%;height:24%;border-radius:50% 50% 50% 50%/25% 25% 0 0;translate:0 29.2em;overflow:hidden;}
.bell-root .bell-ring{width:12em;height:12em;background:#fff;border-radius:50%;translate:0 -6em;box-shadow:0 .8em 1em -.3em #f8e1d0,inset 0 -6em 4em -4em #e3b695,inset 0 1em 3em 1em #fff4,inset 0 2em 3em 1em #fff,inset 0 100em 0 100em #2c2c2c;}
.bell-root .off .bell-ring{background:#000;box-shadow:inset 0 -2em 3em 1em #fff2,inset 0 100em 0 100em #000;}
.bell-root .bell-rays{mix-blend-mode:soft-light;box-shadow:inset 0 -21em 4em -20em #000;width:100%;height:140%;translate:0 -4em;border-radius:50%;}
.bell-root .bell-rays::before{content:'';display:block;width:100em;height:100em;position:absolute;left:-21em;top:-77em;border-radius:100%;filter:blur(.6em);background:repeating-conic-gradient(at 50% 50%,#fff2 0%,transparent .6%,#fff2 .8%);animation:bellradiate 1s linear infinite;}
.bell-root .off .bell-rays{opacity:0}
@keyframes bellradiate{0%{rotate:0deg}100%{rotate:6deg}}
.bell-root .volumetric{width:98%;height:224%;translate:0 124em;opacity:.2;}
.bell-root .volumetric .vl{width:100%;height:100%;transform-origin:50% 20em;rotate:22deg;box-shadow:inset 40em 0 20em -20em #fff1;}
.bell-root .volumetric .vr{width:100%;height:100%;transform-origin:50% 20em;rotate:-22deg;box-shadow:inset -40em 0 20em -20em #fff1;}
.bell-root .off .volumetric{opacity:0}
.bell-root .bell-cta{position:relative;font-size:6em;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#000;top:8em;width:fit-content;height:fit-content;color:#000;cursor:pointer;padding:.4em 1.2em;border-radius:.4em;box-shadow:inset 0 .04em .06em 0 #fff,inset 0 1em 1em 0 #fff5,inset 0 .2em .2em 0 #e3b695;border:none;}
.bell-root .bell-cta:hover,.bell-root .bell-cta:focus-visible{color:#fff;text-shadow:0 -1px 3px #fff;outline:none;}
.bell-root .bell-cta::before{content:'';display:block;width:100%;height:54%;position:absolute;top:6em;left:0;background:#e3b695;transform:scale(2);z-index:-2;filter:blur(12px);border-radius:100%;}
.bell-root .bell-cta::after{content:'';display:block;width:100%;height:54%;position:absolute;top:6em;left:0;background:#000c;z-index:-1;filter:blur(.3em);border-radius:30%;}
.bell-root .hidden-button{opacity:0;pointer-events:none;}
.bell-root .grain{z-index:10;position:absolute;pointer-events:none;inset:0;margin:auto;background:radial-gradient(circle at 50% 50%,#000,#0000);filter:contrast(100%) brightness(200%) grayscale(1) opacity(.12);mix-blend-mode:screen;}
`;

export default function BellNotify({
  isOn,
  onToggle,
  size = 520,
  baseColor = "#b7b5b4",
  rotationAmplitude = 0.8,
  showButton = true,
  buttonLabel = "Notify Me",
  onButtonClick,
  disableToggle = false,
  className = "",
}: BellNotifyProps) {
  const [internalOn, setInternalOn] = useState(true);
  const onState = isOn ?? internalOn;

  const rootStyle = useMemo<React.CSSProperties>(
    () =>
      ({
        fontSize: `calc(${size}px * 0.01)`,
        ["--base-clr" as string]: baseColor,
        ["--degofrot" as string]: rotationAmplitude,
      }) as React.CSSProperties,
    [size, baseColor, rotationAmplitude],
  );

  const handleToggle = useCallback(() => {
    if (disableToggle) return;
    const next = !onState;
    if (isOn === undefined) setInternalOn(next);
    onToggle?.(next);
  }, [disableToggle, onState, isOn, onToggle]);

  return (
    <div className={`bell-root ${className}`} style={rootStyle}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        className={`bell-container ${onState ? "" : "off"}`}
        role="button"
        aria-label="Study reminder bell"
        aria-pressed={onState}
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        <div className="rope" />
        <div className="bell-top" />
        <div className="bell-base" />
        <div className="bell-base" />
        <div className="shadow-l1" />
        <div className="shadow-l2" />
        <div className="left-glow" />
        <div className="left-glow2" />
        <div className="r-glow" />
        <div className="r-glow2" />
        <div className="mid-ring" />
        <div className="mid-ring small" />
        <div className="glow" />
        <div className="glow2" />
        <div className="bell-buff-t" />
        <div className="bell-buff" />
        <div className="bell-btm" />
        <div className="bell-btm2" />
        <div className="bell-ring-container">
          <div className="bell-ring" />
          <div className="bell-rays" />
        </div>
        <div className="volumetric">
          <div className="vl" />
          <div className="vr" />
        </div>
      </div>

      {showButton ? (
        <button type="button" className={`bell-cta ${onState ? "" : "hidden-button"}`} onClick={onButtonClick}>
          {buttonLabel}
        </button>
      ) : null}

      <div className="grain" />
    </div>
  );
}
