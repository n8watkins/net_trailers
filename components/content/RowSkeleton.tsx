/**
 * Placeholder with the same size as a loaded Row (components/content/Row.tsx),
 * shown while a row's data loads so the rows below it do not jump.
 */
export default function RowSkeleton({ cards = 6 }: { cards?: number }) {
    return (
        <div aria-hidden="true">
            <div className="px-4 sm:px-6 md:px-8 lg:px-16">
                <div className="h-7 sm:h-8 md:h-9 w-48 rounded bg-white/5" />
            </div>
            <div className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8 overflow-hidden px-4 sm:px-6 md:px-8 lg:px-16 pt-6 pb-4">
                {Array.from({ length: cards }, (_, i) => (
                    <div
                        key={i}
                        className="flex-shrink-0 w-[120px] xs:w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] xl:w-[220px] min-h-[260px] sm:min-h-[285px] md:min-h-[310px] lg:min-h-[340px] xl:min-h-[370px]"
                    >
                        <div className="h-[180px] xs:h-[210px] sm:h-[240px] md:h-[270px] lg:h-[300px] xl:h-[330px] rounded-md bg-white/5 animate-pulse" />
                        <div className="mt-3.5 h-4 w-3/4 rounded bg-white/5" />
                        <div className="mt-2 h-3 w-1/3 rounded bg-white/5" />
                    </div>
                ))}
            </div>
        </div>
    )
}
