interface TechStackItemProps {
    icon: React.ReactNode
    name: string
}

export default function TechStackItem({ icon, name }: TechStackItemProps) {
    return (
        <div className="flex items-center justify-center space-x-2 px-6 py-3 rounded-lg border-2 border-gray-500/60 transition-all duration-300 hover:border-red-500/80 hover:bg-red-900/20 hover:scale-105 cursor-pointer min-w-0">
            <div className="transition-transform duration-300 hover:scale-110 flex-shrink-0">
                {icon}
            </div>
            <span className="text-base font-medium text-gray-200 transition-colors duration-300 hover:text-white whitespace-nowrap">
                {name}
            </span>
        </div>
    )
}
