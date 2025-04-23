import React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface StatsCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string | number;
  linkText?: string;
  linkHref?: string;
}

export default function StatsCard({
  icon,
  iconBgColor,
  iconColor,
  title,
  value,
  linkText,
  linkHref,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-full", iconBgColor)}>
            <div className={cn("w-6 h-6", iconColor)}>{icon}</div>
          </div>
          {linkText && linkHref && (
            <Link href={linkHref} className="text-xs text-gray-500 hover:text-primary flex items-center">
              {linkText} <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}