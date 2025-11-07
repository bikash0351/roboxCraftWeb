
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CourseForm } from "@/components/course-form";
import type { Course } from "@/lib/data";
import { Loader2 } from "lucide-react";

export default function EditCoursePage() {
    const params = useParams();
    const id = params.id as string;
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchCourse = async () => {
            setLoading(true);
            const docRef = doc(db, "courses", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setCourse({ id: docSnap.id, ...docSnap.data() } as Course);
            } else {
                console.log("No such document!");
            }
            setLoading(false);
        };

        fetchCourse();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!course) {
        return <div className="text-center">Course not found.</div>;
    }

    return <CourseForm existingCourse={course} />;
}
