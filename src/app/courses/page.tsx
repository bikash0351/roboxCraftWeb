
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/course-card";
import type { Course } from "@/lib/data";

export default function CoursesListPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const coursesQuery = query(collection(db, "courses"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(coursesQuery);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto flex h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="font-headline text-4xl font-bold tracking-tight">Our Courses</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Learn robotics and programming from scratch with our expert-led courses.
        </p>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center bg-muted/20 rounded-lg p-8">
          <GraduationCap className="h-24 w-24 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-bold">No Courses Yet</h2>
          <p className="mt-2 text-muted-foreground">Our curriculum is under development. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
