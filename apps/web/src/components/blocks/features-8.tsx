import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Upload, Search, Brain, Sparkles } from "lucide-react";

export function Features() {
  return (
    <section className="bg-transparent py-16 md:py-32">
      <div className="mx-auto max-w-3xl lg:max-w-5xl px-6">
        <div className="relative">
          <div className="relative z-10 grid grid-cols-6 gap-3">
            {/* Card 1: 6+ AI Providers */}
            <Card className="relative col-span-full flex overflow-hidden lg:col-span-2 bg-white/[0.04] backdrop-blur-md border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.2] transition-all duration-300">
              <CardContent className="relative m-auto size-fit pt-6">
                <div className="relative flex h-24 w-56 items-center">
                  <svg className="text-white/10 absolute inset-0 size-full" viewBox="0 0 254 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M112.891 97.7022C140.366 97.0802 171.004 94.6715 201.087 87.5116C210.43 85.2881 219.615 82.6412 228.284 78.2473C232.198 76.3179 235.905 73.9942 239.348 71.3124C241.85 69.2557 243.954 66.7571 245.555 63.9408C249.34 57.3235 248.281 50.5341 242.498 45.6109C239.033 42.7237 235.228 40.2703 231.169 38.3054C219.443 32.7209 207.141 28.4382 194.482 25.534C184.013 23.1927 173.358 21.7755 162.64 21.2989C161.376 21.3512 160.113 21.181 158.908 20.796C158.034 20.399 156.857 19.1682 156.962 18.4535C157.115 17.8927 157.381 17.3689 157.743 16.9139C158.104 16.4588 158.555 16.0821 159.067 15.8066C160.14 15.4683 161.274 15.3733 162.389 15.5286C179.805 15.3556 196.626 18.8373 212.998 24.462C220.978 27.2494 228.798 30.4747 236.423 34.1232C240.476 36.1159 244.202 38.7131 247.474 41.8258C254.342 48.2578 255.745 56.9397 251.841 65.4892C249.793 69.8582 246.736 73.6777 242.921 76.6327C236.224 82.0192 228.522 85.4602 220.502 88.2924C205.017 93.7847 188.964 96.9081 172.738 99.2109C153.442 101.949 133.993 103.478 114.506 103.79C91.1468 104.161 67.9334 102.97 45.1169 97.5831C36.0094 95.5616 27.2626 92.1655 19.1771 87.5116C13.839 84.5746 9.1557 80.5802 5.41318 75.7725C-0.54238 67.7259 -1.13794 59.1763 3.25594 50.2827C5.82447 45.3918 9.29572 41.0315 13.4863 37.4319C24.2989 27.5721 37.0438 20.9681 50.5431 15.7272C68.1451 8.8849 86.4883 5.1395 105.175 2.83669C129.045 0.0992292 153.151 0.134761 177.013 2.94256C197.672 5.23215 218.04 9.01724 237.588 16.3889C240.089 17.3418 242.498 18.5197 244.933 19.6446C246.627 20.4387 247.725 21.6695 246.997 23.615C246.455 25.1105 244.814 25.5605 242.63 24.5811C230.322 18.9961 217.233 16.1904 204.117 13.4376C188.761 10.3438 173.2 8.36665 157.558 7.52174C129.914 5.70776 102.154 8.06792 75.2124 14.5228C60.6177 17.8788 46.5758 23.2977 33.5102 30.6161C26.6595 34.3329 20.4123 39.0673 14.9818 44.658C12.9433 46.8071 11.1336 49.1622 9.58207 51.6855C4.87056 59.5336 5.61172 67.2494 11.9246 73.7608C15.2064 77.0494 18.8775 79.925 22.8564 82.3236C31.6176 87.7101 41.3848 90.5291 51.3902 92.5804C70.6068 96.5773 90.0219 97.7419 112.891 97.7022Z" fill="currentColor" />
                  </svg>
                  <span className="mx-auto block w-fit text-5xl font-semibold text-white">6+</span>
                </div>
                <h2 className="mt-6 text-center text-3xl font-semibold text-white">AI Providers</h2>
              </CardContent>
            </Card>

            {/* Card 2: Secure by default */}
            <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 bg-white/[0.04] backdrop-blur-md border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.2] transition-all duration-300">
              <CardContent className="pt-6">
                <div className="relative mx-auto flex aspect-square size-32 rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/5">
                  <Shield className="m-auto size-12 text-violet-400" strokeWidth={1} />
                </div>
                <div className="relative z-10 mt-6 space-y-2 text-center">
                  <h2 className="text-lg font-medium text-white">Privacy First</h2>
                  <p className="text-white/50 text-sm">Self-hosted with AES-256 encryption. Supports local Ollama (GLM-5.2) inference. Zero external cloud leaks.</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Performance chart */}
            <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2 bg-white/[0.04] backdrop-blur-md border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.2] transition-all duration-300">
              <CardContent className="pt-6">
                <div className="pt-6 lg:px-6">
                  <svg className="text-white/30 w-full" viewBox="0 0 386 123" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="386" height="123" rx="10" />
                    <g clipPath="url(#clip0_perf)">
                      <circle className="text-white/10" cx="29" cy="29" r="15" fill="currentColor" />
                      <path d="M29 23V35" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M35 29L29 35L23 29" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M55.237 32H58.799C61.738 32 63.44 30.182 63.44 27.051V27.037C63.44 23.94 61.725 22.136 58.799 22.136H55.237V32ZM56.769 30.681V23.455H58.628C60.672 23.455 61.882 24.788 61.882 27.058V27.071C61.882 29.361 60.692 30.681 58.628 30.681H56.769Z" fill="currentColor" />
                      <path d="M268.324 34H269.906V21.317H268.333L264.958 23.743V25.413L268.184 23.075H268.324V34Z" fill="currentColor" />
                      <path d="M296.672 34.211C299.212 34.211 301.075 32.647 301.075 30.528V30.511C301.075 28.709 299.818 27.558 297.973 27.399V27.364C299.555 27.03 300.662 25.958 300.662 24.394V24.376C300.662 22.451 299.071 21.106 296.654 21.106C294.281 21.106 292.646 22.486 292.444 24.552L292.436 24.64H293.956L293.965 24.552C294.097 23.269 295.16 22.478 296.654 22.478C298.201 22.478 299.071 23.242 299.071 24.569V24.587C299.071 25.853 298.017 26.784 296.505 26.784H294.984V28.12H296.575C298.351 28.12 299.467 28.99 299.467 30.546V30.564C299.467 31.908 298.333 32.84 296.672 32.84C294.984 32.84 293.833 31.979 293.71 30.731L293.701 30.643H292.181L292.189 30.748C292.356 32.752 294.053 34.211 296.672 34.211Z" fill="currentColor" />
                    </g>
                    <path fillRule="evenodd" clipRule="evenodd" d="M3 123C3 123 14.33 94.153 35.128 88.096C55.927 82.038 65.933 80.551 65.933 80.551C65.933 80.551 80.699 80.551 92.178 80.551C103.656 80.551 100.887 63.535 109.06 63.535C117.233 63.535 117.217 91.973 124.78 91.973C132.343 91.973 142.264 78.03 153.831 80.551C165.398 83.072 186.825 91.973 193.761 91.973C200.697 91.973 206.296 63.535 214.07 63.535C221.844 63.535 238.653 93.777 244.234 91.973C249.814 90.168 258.8 60 266.19 60C272.075 60 284.1 88.057 286.678 88.096C294.762 88.217 300.192 72.928 305.423 72.928C312.323 72.928 323.377 65.244 335.553 63.535C347.729 61.826 348.218 82.07 363.639 80.551C367.875 80.134 372.949 82.202 376.437 87.101C379.446 91.327 381.054 97.433 382.521 104.647C383.479 109.364 382.521 123 382.521 123" fill="url(#paint_perf)" />
                    <path className="text-violet-500" d="M3 121.077C3 121.077 15.304 93.669 36.02 87.756C56.735 81.843 66.663 80.972 66.663 80.972C66.663 80.972 80.033 80.972 91.466 80.972C102.898 80.972 100.415 64.282 108.556 64.282C116.696 64.282 117.693 92.133 125.226 92.133C132.759 92.133 142.07 78.512 153.591 80.972C165.113 83.433 186.092 92.133 193 92.133C199.908 92.133 205.274 64.282 213.017 64.282C220.76 64.282 237.832 93.895 243.39 92.133C248.948 90.372 257.923 60.5 265.284 60.5C271.145 60.5 283.204 87.718 285.772 87.756C293.823 87.875 299.2 73.08 304.411 73.08C311.283 73.08 321.425 65.951 333.552 64.282C345.68 62.614 346.91 82.455 362.27 80.972C377.629 79.489 383 106.605 383 106.605" stroke="currentColor" strokeWidth="3" />
                    <defs>
                      <linearGradient id="paint_perf" x1="3" y1="60" x2="3" y2="123" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#7c3aed" stopOpacity="0.25" />
                        <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                      <clipPath id="clip0_perf"><rect width="358" height="30" fill="white" transform="translate(14 14)" /></clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="relative z-10 mt-14 space-y-2 text-center">
                  <h2 className="text-lg font-medium text-white">Blazing Fast Search</h2>
                  <p className="text-white/50 text-sm">pgvector + Meilisearch hybrid engine. Find any conversation in milliseconds across your entire library.</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Knowledge Graph (wide, left) */}
            <Card className="relative col-span-full overflow-hidden lg:col-span-3 bg-white/[0.04] backdrop-blur-md border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.2] transition-all duration-300">
              <CardContent className="grid pt-6 sm:grid-cols-2">
                <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                  <div className="relative flex aspect-square size-12 rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/5">
                    <Brain className="m-auto size-5 text-cyan-400" strokeWidth={1} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium text-white">Knowledge Graph</h2>
                    <p className="text-white/50 text-sm">Auto-extract entities and relationships. Build a connected, navigable knowledge base from all your conversations.</p>
                  </div>
                </div>
                <div className="rounded-tl-lg relative -mb-6 -mr-6 mt-6 h-fit border-l border-t border-white/10 p-6 py-6 sm:ml-6">
                  <div className="absolute left-3 top-2 flex gap-1">
                    <span className="block size-2 rounded-full border border-white/10 bg-white/10" />
                    <span className="block size-2 rounded-full border border-white/10 bg-white/10" />
                    <span className="block size-2 rounded-full border border-white/10 bg-white/10" />
                  </div>
                  {/* Mini graph visualization */}
                  <svg className="w-full sm:w-[150%]" viewBox="0 0 300 180" fill="none">
                    <circle cx="150" cy="90" r="8" fill="#8b5cf6" opacity="0.8" />
                    <circle cx="80" cy="50" r="6" fill="#06b6d4" opacity="0.6" />
                    <circle cx="220" cy="45" r="6" fill="#06b6d4" opacity="0.6" />
                    <circle cx="60" cy="130" r="5" fill="#a78bfa" opacity="0.5" />
                    <circle cx="240" cy="140" r="5" fill="#a78bfa" opacity="0.5" />
                    <circle cx="150" cy="30" r="5" fill="#22d3ee" opacity="0.5" />
                    <circle cx="110" cy="150" r="4" fill="#c4b5fd" opacity="0.4" />
                    <circle cx="200" cy="160" r="4" fill="#c4b5fd" opacity="0.4" />
                    <line x1="150" y1="90" x2="80" y2="50" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
                    <line x1="150" y1="90" x2="220" y2="45" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
                    <line x1="150" y1="90" x2="60" y2="130" stroke="#8b5cf6" strokeWidth="1" opacity="0.2" />
                    <line x1="150" y1="90" x2="240" y2="140" stroke="#8b5cf6" strokeWidth="1" opacity="0.2" />
                    <line x1="150" y1="90" x2="150" y2="30" stroke="#06b6d4" strokeWidth="1" opacity="0.3" />
                    <line x1="80" y1="50" x2="150" y2="30" stroke="#06b6d4" strokeWidth="1" opacity="0.2" />
                    <line x1="220" y1="45" x2="150" y2="30" stroke="#06b6d4" strokeWidth="1" opacity="0.2" />
                    <line x1="60" y1="130" x2="110" y2="150" stroke="#a78bfa" strokeWidth="1" opacity="0.2" />
                    <line x1="240" y1="140" x2="200" y2="160" stroke="#a78bfa" strokeWidth="1" opacity="0.2" />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Community / Providers (wide, right) */}
            <Card className="relative col-span-full overflow-hidden lg:col-span-3 bg-white/[0.04] backdrop-blur-md border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.2] transition-all duration-300">
              <CardContent className="grid h-full pt-6 sm:grid-cols-2">
                <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                  <div className="relative flex aspect-square size-12 rounded-full border border-white/10 before:absolute before:-inset-2 before:rounded-full before:border before:border-white/5">
                    <Upload className="m-auto size-5 text-emerald-400" strokeWidth={1} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-medium text-white">Universal Import</h2>
                    <p className="text-white/50 text-sm">One-click import from ChatGPT, Claude, Gemini, Grok, and more. Auto-detect format and normalize.</p>
                  </div>
                </div>
                <div className="relative mt-6 before:absolute before:inset-0 before:mx-auto before:w-px before:bg-white/10 sm:-my-6 sm:-mr-6">
                  <div className="relative flex h-full flex-col justify-center space-y-6 py-6">
                    <div className="relative flex w-[calc(50%+0.875rem)] items-center justify-end gap-2">
                      <span className="block h-fit rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 shadow-sm">ChatGPT</span>
                      <div className="size-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><span className="text-[10px] font-bold text-emerald-400">G</span></div>
                    </div>
                    <div className="relative ml-[calc(50%-1rem)] flex items-center gap-2">
                      <div className="size-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><span className="text-[10px] font-bold text-amber-400">C</span></div>
                      <span className="block h-fit rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 shadow-sm">Claude</span>
                    </div>
                    <div className="relative flex w-[calc(50%+0.875rem)] items-center justify-end gap-2">
                      <span className="block h-fit rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 shadow-sm">Gemini</span>
                      <div className="size-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><span className="text-[10px] font-bold text-blue-400">G</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
