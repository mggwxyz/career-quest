import Image from 'next/image'
import { containerClassName } from './_styles/classes'

export default function Home() {
  return (
    <div className={containerClassName}>
      <main className="flex flex-col gap-[32px] items-center">
        <Image src="/images/logo.png" alt="Career Quest" width={320} height={320} />
        <p className="text-2xl font-bold">
          Career Quest
          is a platform for
          students to explore their career options and make informed decisions
          about their future.
        </p>
      </main>
    </div>
  )
}
