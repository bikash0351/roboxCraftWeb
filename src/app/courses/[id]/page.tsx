
"use client";

import Image from "next/image";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Video, ChevronRight, CheckCircle } from "lucide-react";
import { type Course, type Lesson } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const courseRef = doc(db, "courses", id);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
          const courseData = { id: courseSnap.id, ...courseSnap.data() } as Course;
          setCourse(courseData);

          const lessonsQuery = query(collection(db, "courses", id, "lessons"), orderBy("order"));
          const lessonsSnap = await getDocs(lessonsQuery);
          const lessonsData = lessonsSnap.docs.map(doc => doc.data() as Lesson);
          setLessons(lessonsData);

          if (lessonsData.length > 0) {
            setSelectedLesson(lessonsData[0]);
          }
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching course:", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };
    fetchCourseData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return notFound();
  }

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left/Top Column: Lesson Content */}
            <div className="lg:col-span-2">
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                    {selectedLesson?.videoUrl ? (
                         <div className="relative aspect-video w-full">
                            <iframe 
                                src={selectedLesson.videoUrl.replace("watch?v=", "embed/")} 
                                title={selectedLesson.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    ) : (
                        <div className="relative aspect-video w-full">
                           <Image
                                src={course.featuredImage || 'https://placehold.co/1280x720'}
                                alt={course.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6">
                    <h1 className="font-headline text-3xl font-bold">{selectedLesson?.title || course.title}</h1>
                    {selectedLesson && (
                        <div
                            className="prose prose-lg dark:prose-invert max-w-none mt-6"
                            dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                        />
                    )}
                </div>
            </div>

            {/* Right/Bottom Column: Course Info & Lesson List */}
            <aside className="lg:col-span-1">
                <div className="sticky top-24 space-y-6">
                     <div className="border rounded-lg p-4">
                        <h2 className="font-headline text-2xl font-bold">{course.title}</h2>
                        <p className="text-muted-foreground mt-2">{course.description}</p>
                        
                        {!user && (
                            <>
                                <Separator className="my-4" />
                                <p className="text-sm text-center text-muted-foreground">Sign in to track your progress.</p>
                                 <Button asChild className="w-full mt-2"><Link href="/login">Sign In</Link></Button>
                            </>
                        )}
                    </div>
                    
                    <Accordion type="single" collapsible defaultValue="item-1" className="w-full border rounded-lg px-4">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="font-headline text-lg">Course Content</AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-1 -mx-4">
                                {lessons.map(lesson => (
                                    <li key={lesson.id}>
                                        <button
                                            onClick={() => setSelectedLesson(lesson)}
                                            className={cn(
                                                "w-full text-left flex items-center gap-3 p-4 transition-colors hover:bg-muted/50",
                                                selectedLesson?.id === lesson.id && "bg-primary/10 text-primary font-semibold"
                                            )}
                                        >
                                            {lesson.videoUrl ? <Video className="h-4 w-4 flex-shrink-0" /> : <BookOpen className="h-4 w-4 flex-shrink-0" />}
                                            <span className="flex-1">{lesson.title}</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </aside>
        </div>
    </div>
  );
}
