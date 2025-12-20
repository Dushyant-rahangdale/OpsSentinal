'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPolicy(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    // Parsing rules from weird form data structures (e.g. rule-0-user, rule-0-delay)
    // For prototype simplicity, we'll assume up to 3 static steps submitted
    const rules = [];
    for (let i = 0; i < 3; i++) {
        const userId = formData.get(`rule-${i}-user`);
        const delay = formData.get(`rule-${i}-delay`);

        if (userId) {
            rules.push({
                targetUserId: userId as string,
                delayMinutes: parseInt(delay as string || '0'),
                stepOrder: i
            });
        }
    }

    await prisma.escalationPolicy.create({
        data: {
            name,
            description,
            steps: {
                create: rules
            }
        }
    });

    revalidatePath('/policies');
    redirect('/policies');
}
