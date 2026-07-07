import Image from "next/image";
import signupLogoBg from "@/assets/signup-logo-bg.png";
import xselLogo from "@/assets/xsel-logo.png";
import { ContainerTextFlip } from "@/components/ui/container-text-flip";

export function AuthHeroPanel() {
  return (
    <div className="relative hidden h-full shrink-0 overflow-hidden bg-white lg:block lg:w-[46%] xl:w-1/2">
      <Image
        src={signupLogoBg}
        alt=""
        fill
        priority
        aria-hidden
        className="object-cover object-center"
        sizes="50vw"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10">
        <div className="flex w-full max-w-[min(420px,85%)] flex-col items-center gap-2">
          <Image
            src={xselLogo}
            alt="Sarwar's English Lab"
            priority
            className="h-auto w-full"
            sizes="(max-width: 1280px) 46vw, 50vw"
          />
          <ContainerTextFlip
            words={["Learn", "Practice", "Excel"]}
            interval={2500}
            className="bg-brand px-4 py-1 text-base text-white shadow-none md:text-lg"
            textClassName="font-semibold tracking-wide text-white"
          />
        </div>
      </div>
    </div>
  );
}
