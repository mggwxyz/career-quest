import { FlowStepper } from '@/components/flow-stepper'

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 lg:px-0 py-6 max-w-5xl relative">
      <FlowStepper />
      {children}
    </div>
  )
}
