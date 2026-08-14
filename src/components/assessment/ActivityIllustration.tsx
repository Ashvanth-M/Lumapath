import { Ear, Hand, HandMetal, Megaphone, MessageCircleHeart, Pointer, Smile, ToyBrick } from "lucide-react";

const ICONS: Record<string, typeof Smile> = {
  megaphone: Megaphone,
  smile: Smile,
  toy: ToyBrick,
  clap: HandMetal,
  speech: MessageCircleHeart,
  wave: Hand,
  peekaboo: Ear,
  point: Pointer,
};

export function ActivityIllustration({ icon }: { icon: string }) {
  const Icon = ICONS[icon] ?? Smile;
  return (
    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-aurora">
      <div className="absolute -left-8 -top-10 h-40 w-40 rounded-full bg-white/15 opacity-70" />
      <div className="absolute -bottom-12 right-0 h-44 w-44 rounded-full bg-white/10 opacity-70" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 ">
        <Icon className="h-9 w-9 text-white" />
      </div>
    </div>
  );
}