import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listClasses } from "../../api/classes";
import { Spinner } from "../../components/ui/Spinner";
import { GraduationCap, Users } from "lucide-react";

export default function ClassesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: () => listClasses().then(r => r.data.classes),
  });

  if (isLoading) return <Spinner />;

  const classes = data || [];

  const classIcons = {
    "UG_1A": "1A", "UG_1B": "1B", "UG_2A": "2A", "UG_2B": "2B",
    "UG_3A": "3A", "UG_3B": "3B", "PG_1A": "PG1A", "PG_2A": "PG2A",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Classes</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage classes and student lists</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {classes.map(c => (
          <Link
            key={c.class_name}
            to={`/classes/${c.class_name}`}
            className="group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="font-bold text-primary-600 text-sm">{classIcons[c.class_name]}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.class_name.replace("_", " ")}</h3>
                {c.incharge ? (
                  <p className="text-xs text-gray-500">Incharge: {c.incharge.name}</p>
                ) : (
                  <p className="text-xs text-gray-400 italic">No incharge assigned</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Users className="w-4 h-4" />
                <span>{c.student_count} students</span>
              </div>
              {c.forum_member_count !== undefined && (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <GraduationCap className="w-4 h-4" />
                  <span>{c.forum_member_count} forum</span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                c.invite_active
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.invite_active ? "bg-green-500" : "bg-gray-400"}`} />
                Invite {c.invite_active ? "Active" : "Disabled"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
