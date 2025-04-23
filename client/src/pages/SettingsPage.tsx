import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Settings2, Wrench } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Settings2 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">System Settings</h1>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Under Development</AlertTitle>
        <AlertDescription>
          The settings page is currently under development. This page will allow administrators to manage system-wide settings.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-500 italic">
            Coming soon
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Configure global system settings
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-500 italic">
            Coming soon
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle>Backup & Restore</CardTitle>
            <CardDescription>
              Manage database backups and restoration
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-500 italic">
            Coming soon
          </CardContent>
        </Card>
        
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Manage third-party service integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="text-gray-500 italic">
            Coming soon
          </CardContent>
        </Card>
      </div>
      
      <div className="flex items-center justify-center p-8 text-gray-400">
        <Wrench className="h-5 w-5 mr-2" />
        <span>This feature is in development and will be available soon.</span>
      </div>
    </div>
  );
}