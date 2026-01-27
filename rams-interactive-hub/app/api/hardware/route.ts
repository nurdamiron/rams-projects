import { NextResponse } from 'next/server';
import WiFiHardwareService from '@/lib/hardware/wifi';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, projectId, data, target, state } = body;

        // Validate request
        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        // Resolve project ID if it's a string/slug
        let finalProjectId = projectId;
        if (typeof projectId === 'string') {
            const { RAMS_PROJECTS } = await import('@/lib/data/projects');
            const project = RAMS_PROJECTS.find(p => p.id === projectId);
            if (project && project.hardwareId) {
                finalProjectId = project.hardwareId;
            }
        }

        const wifi = WiFiHardwareService.getInstance();
        const success = await wifi.sendCommand({
            action,
            projectId: finalProjectId,
            target,
            state,
            data
        });

        if (success) {
            return NextResponse.json({ success: true, message: 'Command sent' });
        } else {
            return NextResponse.json({ success: false, message: 'Hardware not connected' }, { status: 503 });
        }
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    const wifi = WiFiHardwareService.getInstance();
    return NextResponse.json(wifi.getStatus());
}
