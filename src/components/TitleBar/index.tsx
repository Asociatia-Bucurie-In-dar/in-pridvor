import React from 'react'

type TitleBarProps = {
  title: string
  prefix?: string
}

export const TitleBar: React.FC<TitleBarProps> = ({ title, prefix }) => {
  return (
    <div className="title-bar w-full -mx-4 md:-mx-8 2xl:-mx-16 px-0 md:px-8 py-8 md:py-12 animate-fade-in mt-8 mb-4">
      <div className="container relative z-10">
        <div className="prose max-w-none text-center">
          <h1 className="text-4xl lg:text-5xl font-medium m-0 animate-title-slide-up text-gray-800">
            {prefix && <span className="text-gray-600 font-normal">{prefix}</span>}
            {prefix && ' '}
            {title}
          </h1>
        </div>
      </div>
    </div>
  )
}
