You are given a task to integrate an existing React component in the codebase



The codebase should support:

\- shadcn project structure  

\- Tailwind CSS

\- Typescript



If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.



Determine the default path for components and styles. 

If default path for components is not /components/ui, provide instructions on why it's important to create this folder

Copy-paste this component to /components/ui folder:

```tsx

hero-section-4.tsx

'use client'

import React from 'react'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

import { InfiniteSlider } from '@/components/ui/infinite-slider'

import { ProgressiveBlur } from '@/components/ui/progressive-blur'

import { cn } from '@/lib/utils'

import { Menu, X } from 'lucide-react'



export function HeroSection() {

&#x20;   return (

&#x20;       <>

&#x20;           <HeroHeader />

&#x20;           <main className="overflow-x-hidden">

&#x20;               <section>

&#x20;                   <div className="pb-24 pt-12 md:pb-32 lg:pb-56 lg:pt-44">

&#x20;                       <div className="relative mx-auto flex max-w-6xl flex-col px-6 lg:block">

&#x20;                           <div className="mx-auto max-w-lg text-center lg:ml-0 lg:w-1/2 lg:text-left">

&#x20;                               <h1 className="mt-8 max-w-2xl text-balance text-5xl font-medium md:text-6xl lg:mt-16 xl:text-7xl">Ship 10x Faster with NS</h1>

&#x20;                               <p className="mt-8 max-w-2xl text-pretty text-lg">Highly customizable components for building modern websites and applications that look and feel the way you mean it.</p>



&#x20;                               <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">

&#x20;                                   <Button

&#x20;                                       asChild

&#x20;                                       size="lg"

&#x20;                                       className="px-5 text-base">

&#x20;                                       <Link href="#link">

&#x20;                                           <span className="text-nowrap">Start Building</span>

&#x20;                                       </Link>

&#x20;                                   </Button>

&#x20;                                   <Button

&#x20;                                       key={2}

&#x20;                                       asChild

&#x20;                                       size="lg"

&#x20;                                       variant="ghost"

&#x20;                                       className="px-5 text-base">

&#x20;                                       <Link href="#link">

&#x20;                                           <span className="text-nowrap">Request a demo</span>

&#x20;                                       </Link>

&#x20;                                   </Button>

&#x20;                               </div>

&#x20;                           </div>

&#x20;                           <img

&#x20;                               className="pointer-events-none order-first ml-auto h-56 w-full object-cover invert sm:h-96 lg:absolute lg:inset-0 lg:-right-20 lg:-top-96 lg:order-last lg:h-max lg:w-2/3 lg:object-contain dark:mix-blend-lighten dark:invert-0"

&#x20;                               src="https://ik.imagekit.io/lrigu76hy/tailark/abstract-bg.jpg?updatedAt=1745733473768"

&#x20;                               alt="Abstract Object"

&#x20;                               height="4000"

&#x20;                               width="3000"

&#x20;                           />

&#x20;                       </div>

&#x20;                   </div>

&#x20;               </section>

&#x20;               <section className="bg-background pb-16 md:pb-32">

&#x20;                   <div className="group relative m-auto max-w-6xl px-6">

&#x20;                       <div className="flex flex-col items-center md:flex-row">

&#x20;                           <div className="md:max-w-44 md:border-r md:pr-6">

&#x20;                               <p className="text-end text-sm">Powering the best teams</p>

&#x20;                           </div>

&#x20;                           <div className="relative py-6 md:w-\[calc(100%-11rem)]">

&#x20;                               <InfiniteSlider

&#x20;                                   speedOnHover={20}

&#x20;                                   speed={40}

&#x20;                                   gap={112}>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-5 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/nvidia.svg"

&#x20;                                           alt="Nvidia Logo"

&#x20;                                           height="20"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>



&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-4 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/column.svg"

&#x20;                                           alt="Column Logo"

&#x20;                                           height="16"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-4 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/github.svg"

&#x20;                                           alt="GitHub Logo"

&#x20;                                           height="16"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-5 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/nike.svg"

&#x20;                                           alt="Nike Logo"

&#x20;                                           height="20"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-5 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/lemonsqueezy.svg"

&#x20;                                           alt="Lemon Squeezy Logo"

&#x20;                                           height="20"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-4 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/laravel.svg"

&#x20;                                           alt="Laravel Logo"

&#x20;                                           height="16"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-7 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/lilly.svg"

&#x20;                                           alt="Lilly Logo"

&#x20;                                           height="28"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>



&#x20;                                   <div className="flex">

&#x20;                                       <img

&#x20;                                           className="mx-auto h-6 w-fit dark:invert"

&#x20;                                           src="https://html.tailus.io/blocks/customers/openai.svg"

&#x20;                                           alt="OpenAI Logo"

&#x20;                                           height="24"

&#x20;                                           width="auto"

&#x20;                                       />

&#x20;                                   </div>

&#x20;                               </InfiniteSlider>



&#x20;                               <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>

&#x20;                               <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>

&#x20;                               <ProgressiveBlur

&#x20;                                   className="pointer-events-none absolute left-0 top-0 h-full w-20"

&#x20;                                   direction="left"

&#x20;                                   blurIntensity={1}

&#x20;                               />

&#x20;                               <ProgressiveBlur

&#x20;                                   className="pointer-events-none absolute right-0 top-0 h-full w-20"

&#x20;                                   direction="right"

&#x20;                                   blurIntensity={1}

&#x20;                               />

&#x20;                           </div>

&#x20;                       </div>

&#x20;                   </div>

&#x20;               </section>

&#x20;           </main>

&#x20;       </>

&#x20;   )

}



const menuItems = \[

&#x20;   { name: 'Features', href: '#link' },

&#x20;   { name: 'Solution', href: '#link' },

&#x20;   { name: 'Pricing', href: '#link' },

&#x20;   { name: 'About', href: '#link' },

]



const HeroHeader = () => {

&#x20;   const \[menuState, setMenuState] = React.useState(false)

&#x20;   return (

&#x20;       <header>

&#x20;           <nav

&#x20;               data-state={menuState \&\& 'active'}

&#x20;               className="group bg-background/50 fixed z-20 w-full border-b backdrop-blur-3xl">

&#x20;               <div className="mx-auto max-w-6xl px-6 transition-all duration-300">

&#x20;                   <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">

&#x20;                       <div className="flex w-full items-center justify-between gap-12 lg:w-auto">

&#x20;                           <Link

&#x20;                               href="/"

&#x20;                               aria-label="home"

&#x20;                               className="flex items-center space-x-2">

&#x20;                               <Logo />

&#x20;                           </Link>



&#x20;                           <button

&#x20;                               onClick={() => setMenuState(!menuState)}

&#x20;                               aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}

&#x20;                               className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">

&#x20;                               <Menu className="group-data-\[state=active]:rotate-180 group-data-\[state=active]:scale-0 group-data-\[state=active]:opacity-0 m-auto size-6 duration-200" />

&#x20;                               <X className="group-data-\[state=active]:rotate-0 group-data-\[state=active]:scale-100 group-data-\[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />

&#x20;                           </button>



&#x20;                           <div className="hidden lg:block">

&#x20;                               <ul className="flex gap-8 text-sm">

&#x20;                                   {menuItems.map((item, index) => (

&#x20;                                       <li key={index}>

&#x20;                                           <Link

&#x20;                                               href={item.href}

&#x20;                                               className="text-muted-foreground hover:text-accent-foreground block duration-150">

&#x20;                                               <span>{item.name}</span>

&#x20;                                           </Link>

&#x20;                                       </li>

&#x20;                                   ))}

&#x20;                               </ul>

&#x20;                           </div>

&#x20;                       </div>



&#x20;                       <div className="bg-background group-data-\[state=active]:block lg:group-data-\[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">

&#x20;                           <div className="lg:hidden">

&#x20;                               <ul className="space-y-6 text-base">

&#x20;                                   {menuItems.map((item, index) => (

&#x20;                                       <li key={index}>

&#x20;                                           <Link

&#x20;                                               href={item.href}

&#x20;                                               className="text-muted-foreground hover:text-accent-foreground block duration-150">

&#x20;                                               <span>{item.name}</span>

&#x20;                                           </Link>

&#x20;                                       </li>

&#x20;                                   ))}

&#x20;                               </ul>

&#x20;                           </div>

&#x20;                           <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">

&#x20;                               <Button

&#x20;                                   asChild

&#x20;                                   variant="outline"

&#x20;                                   size="sm">

&#x20;                                   <Link href="#">

&#x20;                                       <span>Login</span>

&#x20;                                   </Link>

&#x20;                               </Button>

&#x20;                               <Button

&#x20;                                   asChild

&#x20;                                   size="sm">

&#x20;                                   <Link href="#">

&#x20;                                       <span>Sign Up</span>

&#x20;                                   </Link>

&#x20;                               </Button>

&#x20;                           </div>

&#x20;                       </div>

&#x20;                   </div>

&#x20;               </div>

&#x20;           </nav>

&#x20;       </header>

&#x20;   )

}



const Logo = ({ className }: { className?: string }) => {

&#x20;   return (

&#x20;       <svg

&#x20;           viewBox="0 0 78 18"

&#x20;           fill="none"

&#x20;           xmlns="http://www.w3.org/2000/svg"

&#x20;           className={cn('h-5 w-auto', className)}>

&#x20;           <path

&#x20;               d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z"

&#x20;               fill="url(#logo-gradient)"

&#x20;           />

&#x20;           <path

&#x20;               d="M27.06 7.054V12.239C27.06 12.5903 27.1393 12.8453 27.298 13.004C27.468 13.1513 27.7513 13.225 28.148 13.225H29.338V14.84H27.808C26.9353 14.84 26.2667 14.636 25.802 14.228C25.3373 13.82 25.105 13.157 25.105 12.239V7.054H24V5.473H25.105V3.144H27.06V5.473H29.338V7.054H27.06ZM30.4782 10.114C30.4782 9.17333 30.6709 8.34033 31.0562 7.615C31.4529 6.88967 31.9855 6.32867 32.6542 5.932C33.3342 5.524 34.0822 5.32 34.8982 5.32C35.6349 5.32 36.2752 5.46733 36.8192 5.762C37.3745 6.04533 37.8165 6.40233 38.1452 6.833V5.473H40.1002V14.84H38.1452V13.446C37.8165 13.888 37.3689 14.2563 36.8022 14.551C36.2355 14.8457 35.5895 14.993 34.8642 14.993C34.0595 14.993 33.3229 14.789 32.6542 14.381C31.9855 13.9617 31.4529 13.3837 31.0562 12.647C30.6709 11.899 30.4782 11.0547 30.4782 10.114ZM38.1452 10.148C38.1452 9.502 38.0092 8.941 37.7372 8.465C37.4765 7.989 37.1309 7.62633 36.7002 7.377C36.2695 7.12767 35.8049 7.003 35.3062 7.003C34.8075 7.003 34.3429 7.12767 33.9122 7.377C33.4815 7.615 33.1302 7.972 32.8582 8.448C32.5975 8.91267 32.4672 9.468 32.4672 10.114C32.4672 10.76 32.5975 11.3267 32.8582 11.814C33.1302 12.3013 33.4815 12.6753 33.9122 12.936C34.3542 13.1853 34.8189 13.31 35.3062 13.31C35.8049 13.31 36.2695 13.1853 36.7002 12.936C37.1309 12.6867 37.4765 12.324 37.7372 11.848C38.0092 11.3607 38.1452 10.794 38.1452 10.148ZM43.6317 4.232C43.2803 4.232 42.9857 4.113 42.7477 3.875C42.5097 3.637 42.3907 3.34233 42.3907 2.991C42.3907 2.63967 42.5097 2.345 42.7477 2.107C42.9857 1.869 43.2803 1.75 43.6317 1.75C43.9717 1.75 44.2607 1.869 44.4987 2.107C44.7367 2.345 44.8557 2.63967 44.8557 2.991C44.8557 3.34233 44.7367 3.637 44.4987 3.875C44.2607 4.113 43.9717 4.232 43.6317 4.232ZM44.5837 5.473V14.84H42.6457V5.473H44.5837ZM49.0661 2.26V14.84H47.1281V2.26H49.0661ZM50.9645 10.114C50.9645 9.17333 51.1572 8.34033 51.5425 7.615C51.9392 6.88967 52.4719 6.32867 53.1405 5.932C53.8205 5.524 54.5685 5.32 55.3845 5.32C56.1212 5.32 56.7615 5.46733 57.3055 5.762C57.8609 6.04533 58.3029 6.40233 58.6315 6.833V5.473H60.5865V14.84H58.6315V13.446C58.3029 13.888 57.8552 14.2563 57.2885 14.551C56.7219 14.8457 56.0759 14.993 55.3505 14.993C54.5459 14.993 53.8092 14.789 53.1405 14.381C52.4719 13.9617 51.9392 13.3837 51.5425 12.647C51.1572 11.899 50.9645 11.0547 50.9645 10.114ZM58.6315 10.148C58.6315 9.502 58.4955 8.941 58.2235 8.465C57.9629 7.989 57.6172 7.62633 57.1865 7.377C56.7559 7.12767 56.2912 7.003 55.7925 7.003C55.2939 7.003 54.8292 7.12767 54.3985 7.377C53.9679 7.615 53.6165 7.972 53.3445 8.448C53.0839 8.91267 52.9535 9.468 52.9535 10.114C52.9535 10.76 53.0839 11.3267 53.3445 11.814C53.6165 12.3013 53.9679 12.6753 54.3985 12.936C54.8405 13.1853 55.3052 13.31 55.7925 13.31C56.2912 13.31 56.7559 13.1853 57.1865 12.936C57.6172 12.6867 57.9629 12.324 58.2235 11.848C58.4955 11.3607 58.6315 10.794 58.6315 10.148ZM65.07 6.833C65.3533 6.357 65.7273 5.98867 66.192 5.728C66.668 5.456 67.229 5.32 67.875 5.32V7.326H67.382C66.6227 7.326 66.0447 7.51867 65.648 7.904C65.2627 8.28933 65.07 8.958 65.07 9.91V14.84H63.132V5.473H65.07V6.833ZM73.3624 10.165L77.6804 14.84H75.0624L71.5944 10.811V14.84H69.6564V2.26H71.5944V9.57L74.9944 5.473H77.6804L73.3624 10.165Z"

&#x20;               fill="currentColor"

&#x20;           />

&#x20;           <defs>

&#x20;               <linearGradient

&#x20;                   id="logo-gradient"

&#x20;                   x1="10"

&#x20;                   y1="0"

&#x20;                   x2="10"

&#x20;                   y2="20"

&#x20;                   gradientUnits="userSpaceOnUse">

&#x20;                   <stop stopColor="#9B99FE" />

&#x20;                   <stop

&#x20;                       offset="1"

&#x20;                       stopColor="#2BC8B7"

&#x20;                   />

&#x20;               </linearGradient>

&#x20;           </defs>

&#x20;       </svg>

&#x20;   )

}





demo.tsx

import {HeroSection} from "@/components/blocks/hero-section-4"



export function Demo (){

&#x20;   return <HeroSection />

}

```



Copy-paste these files for dependencies:

```tsx

shadcn/button

import \* as React from "react"

import { Slot } from "@radix-ui/react-slot"

import { cva, type VariantProps } from "class-variance-authority"



import { cn } from "@/lib/utils"



const buttonVariants = cva(

&#x20; "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",

&#x20; {

&#x20;   variants: {

&#x20;     variant: {

&#x20;       default: "bg-primary text-primary-foreground hover:bg-primary/90",

&#x20;       destructive:

&#x20;         "bg-destructive text-destructive-foreground hover:bg-destructive/90",

&#x20;       outline:

&#x20;         "border border-input bg-background hover:bg-accent hover:text-accent-foreground",

&#x20;       secondary:

&#x20;         "bg-secondary text-secondary-foreground hover:bg-secondary/80",

&#x20;       ghost: "hover:bg-accent hover:text-accent-foreground",

&#x20;       link: "text-primary underline-offset-4 hover:underline",

&#x20;     },

&#x20;     size: {

&#x20;       default: "h-10 px-4 py-2",

&#x20;       sm: "h-9 rounded-md px-3",

&#x20;       lg: "h-11 rounded-md px-8",

&#x20;       icon: "h-10 w-10",

&#x20;     },

&#x20;   },

&#x20;   defaultVariants: {

&#x20;     variant: "default",

&#x20;     size: "default",

&#x20;   },

&#x20; },

)



export interface ButtonProps

&#x20; extends React.ButtonHTMLAttributes<HTMLButtonElement>,

&#x20;   VariantProps<typeof buttonVariants> {

&#x20; asChild?: boolean

}



const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(

&#x20; ({ className, variant, size, asChild = false, ...props }, ref) => {

&#x20;   const Comp = asChild ? Slot : "button"

&#x20;   return (

&#x20;     <Comp

&#x20;       className={cn(buttonVariants({ variant, size, className }))}

&#x20;       ref={ref}

&#x20;       {...props}

&#x20;     />

&#x20;   )

&#x20; },

)

Button.displayName = "Button"



export { Button, buttonVariants }



```

```tsx

ibelick/infinite-slider

'use client';

import { cn } from '@/lib/utils';

import { useMotionValue, animate, motion } from 'framer-motion';

import { useState, useEffect } from 'react';

import useMeasure from 'react-use-measure';



type InfiniteSliderProps = {

&#x20; children: React.ReactNode;

&#x20; gap?: number;

&#x20; duration?: number;

&#x20; durationOnHover?: number;

&#x20; direction?: 'horizontal' | 'vertical';

&#x20; reverse?: boolean;

&#x20; className?: string;

};



export function InfiniteSlider({

&#x20; children,

&#x20; gap = 16,

&#x20; duration = 25,

&#x20; durationOnHover,

&#x20; direction = 'horizontal',

&#x20; reverse = false,

&#x20; className,

}: InfiniteSliderProps) {

&#x20; const \[currentDuration, setCurrentDuration] = useState(duration);

&#x20; const \[ref, { width, height }] = useMeasure();

&#x20; const translation = useMotionValue(0);

&#x20; const \[isTransitioning, setIsTransitioning] = useState(false);

&#x20; const \[key, setKey] = useState(0);



&#x20; useEffect(() => {

&#x20;   let controls;

&#x20;   const size = direction === 'horizontal' ? width : height;

&#x20;   const contentSize = size + gap;

&#x20;   const from = reverse ? -contentSize / 2 : 0;

&#x20;   const to = reverse ? 0 : -contentSize / 2;



&#x20;   if (isTransitioning) {

&#x20;     controls = animate(translation, \[translation.get(), to], {

&#x20;       ease: 'linear',

&#x20;       duration:

&#x20;         currentDuration \* Math.abs((translation.get() - to) / contentSize),

&#x20;       onComplete: () => {

&#x20;         setIsTransitioning(false);

&#x20;         setKey((prevKey) => prevKey + 1);

&#x20;       },

&#x20;     });

&#x20;   } else {

&#x20;     controls = animate(translation, \[from, to], {

&#x20;       ease: 'linear',

&#x20;       duration: currentDuration,

&#x20;       repeat: Infinity,

&#x20;       repeatType: 'loop',

&#x20;       repeatDelay: 0,

&#x20;       onRepeat: () => {

&#x20;         translation.set(from);

&#x20;       },

&#x20;     });

&#x20;   }



&#x20;   return controls?.stop;

&#x20; }, \[

&#x20;   key,

&#x20;   translation,

&#x20;   currentDuration,

&#x20;   width,

&#x20;   height,

&#x20;   gap,

&#x20;   isTransitioning,

&#x20;   direction,

&#x20;   reverse,

&#x20; ]);



&#x20; const hoverProps = durationOnHover

&#x20;   ? {

&#x20;       onHoverStart: () => {

&#x20;         setIsTransitioning(true);

&#x20;         setCurrentDuration(durationOnHover);

&#x20;       },

&#x20;       onHoverEnd: () => {

&#x20;         setIsTransitioning(true);

&#x20;         setCurrentDuration(duration);

&#x20;       },

&#x20;     }

&#x20;   : {};



&#x20; return (

&#x20;   <div className={cn('overflow-hidden', className)}>

&#x20;     <motion.div

&#x20;       className='flex w-max'

&#x20;       style={{

&#x20;         ...(direction === 'horizontal'

&#x20;           ? { x: translation }

&#x20;           : { y: translation }),

&#x20;         gap: `${gap}px`,

&#x20;         flexDirection: direction === 'horizontal' ? 'row' : 'column',

&#x20;       }}

&#x20;       ref={ref}

&#x20;       {...hoverProps}

&#x20;     >

&#x20;       {children}

&#x20;       {children}

&#x20;     </motion.div>

&#x20;   </div>

&#x20; );

}



```

```tsx

ibelick/progressive-blur

'use client';

import { cn } from '@/lib/utils';

import { HTMLMotionProps, motion } from 'motion/react';



export const GRADIENT\_ANGLES = {

&#x20; top: 0,

&#x20; right: 90,

&#x20; bottom: 180,

&#x20; left: 270,

};



export type ProgressiveBlurProps = {

&#x20; direction?: keyof typeof GRADIENT\_ANGLES;

&#x20; blurLayers?: number;

&#x20; className?: string;

&#x20; blurIntensity?: number;

} \& HTMLMotionProps<'div'>;



export function ProgressiveBlur({

&#x20; direction = 'bottom',

&#x20; blurLayers = 8,

&#x20; className,

&#x20; blurIntensity = 0.25,

&#x20; ...props

}: ProgressiveBlurProps) {

&#x20; const layers = Math.max(blurLayers, 2);

&#x20; const segmentSize = 1 / (blurLayers + 1);



&#x20; return (

&#x20;   <div className={cn('relative', className)}>

&#x20;     {Array.from({ length: layers }).map((\_, index) => {

&#x20;       const angle = GRADIENT\_ANGLES\[direction];

&#x20;       const gradientStops = \[

&#x20;         index \* segmentSize,

&#x20;         (index + 1) \* segmentSize,

&#x20;         (index + 2) \* segmentSize,

&#x20;         (index + 3) \* segmentSize,

&#x20;       ].map(

&#x20;         (pos, posIndex) =>

&#x20;           `rgba(255, 255, 255, ${posIndex === 1 || posIndex === 2 ? 1 : 0}) ${pos \* 100}%`

&#x20;       );



&#x20;       const gradient = `linear-gradient(${angle}deg, ${gradientStops.join(

&#x20;         ', '

&#x20;       )})`;



&#x20;       return (

&#x20;         <motion.div

&#x20;           key={index}

&#x20;           className='pointer-events-none absolute inset-0 rounded-\[inherit]'

&#x20;           style={{

&#x20;             maskImage: gradient,

&#x20;             WebkitMaskImage: gradient,

&#x20;             backdropFilter: `blur(${index \* blurIntensity}px)`,

&#x20;           }}

&#x20;           {...props}

&#x20;         />

&#x20;       );

&#x20;     })}

&#x20;   </div>

&#x20; );

}



```



Install NPM dependencies:

```bash

lucide-react, @radix-ui/react-slot, class-variance-authority, framer-motion, react-use-measure, motion

```



Implementation Guidelines

&#x20;1. Analyze the component structure and identify all required dependencies

&#x20;2. Review the component's argumens and state

&#x20;3. Identify any required context providers or hooks and install them

&#x20;4. Questions to Ask

&#x20;- What data/props will be passed to this component?

&#x20;- Are there any specific state management requirements?

&#x20;- Are there any required assets (images, icons, etc.)?

&#x20;- What is the expected responsive behavior?

&#x20;- What is the best place to use this component in the app?



Steps to integrate

&#x20;0. Copy paste all the code above in the correct directories

&#x20;1. Install external dependencies

&#x20;2. Fill image assets with Unsplash stock images you know exist

&#x20;3. Use lucide-react icons for svgs or logos if component requires them



