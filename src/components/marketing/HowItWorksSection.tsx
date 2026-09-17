'use client'

export default function HowItWorksSection() {
  // A genuine sequence, so the numbering carries information.
  const steps = [
    {
      title: 'The organiser opens a session',
      description:
        'Give it a name and you get a short code, a share link and a QR code to put on the screen.'
    },
    {
      title: 'Everyone joins from their phone',
      description:
        'A name and a mobile number, no account and no app. The number is only visible to the organiser.'
    },
    {
      title: 'Bids land live, round by round',
      description:
        'Tap an amount and every screen in the hall updates. The organiser opens each round when the room is ready.'
    }
  ]

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-hairline">
      <div className="flex flex-col gap-2 mb-10">
        <span className="label">How it works</span>
        <h2 className="text-2xl sm:text-3xl">From a code to a full room in a minute</h2>
      </div>

      <ol className="flex flex-col list-none p-0 m-0">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[2rem_1fr] gap-4 py-6 border-b border-hairline last:border-b-0"
          >
            <span className="num text-ink-3 pt-0.5">{index + 1}</span>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg">{step.title}</h3>
              <p className="text-ink-2 m-0">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
