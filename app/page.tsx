'use client';
import ImageEditor from '@/components/image-editor';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <section className="container grid place-items-center gap-6 pt-6 pb-8 md:py-10">
        <div className="max-w-[980px] gap-2 text-center">
          <h1 className="text-lg font-extrabold leading-tight tracking-tighter sm:text-3xl md:text-xlg lg:text-xlg">
            Magic Animate - Animate your images with one click
          </h1>

          <p className="mt-4 text-lg text-slate-700 dark:text-slate-400 sm:text-xl">
            Upload your photo, paint over the area you would like to animate and
            click go, is that easy.
          </p>
        </div>
        <div className="max-w-lg">
          <ImageEditor />
        </div>
      </section>
    </main>
  );
}
