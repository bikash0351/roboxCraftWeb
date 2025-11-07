
"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Course } from "@/lib/data";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lg">
       <Link href={`/courses/${course.id}`} className="flex flex-col flex-1">
        <div className="relative aspect-video w-full">
            <Image
            src={course.featuredImage || "https://placehold.co/600x400"}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
        </div>
        <CardHeader>
            <CardTitle className="font-headline text-xl">{course.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
            <CardDescription className="line-clamp-3">{course.description}</CardDescription>
        </CardContent>
      </Link>
    </Card>
  );
}
