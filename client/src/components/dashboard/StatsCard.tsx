import { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: string | number;
  linkText?: string;
  linkHref?: string;
  onClick?: () => void;
}

export default function StatsCard({
  icon,
  iconBgColor,
  iconColor,
  title,
  value,
  linkText = "View details",
  linkHref = "#",
  onClick,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <div className={cn("h-6 w-6", iconColor)}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {linkText && (
        <CardFooter className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <a
              href={linkHref}
              onClick={(e) => {
                if (onClick) {
                  e.preventDefault();
                  onClick();
                }
              }}
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              {linkText}
            </a>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
