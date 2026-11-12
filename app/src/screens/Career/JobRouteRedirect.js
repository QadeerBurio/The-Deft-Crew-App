// app/src/screens/Career/JobRouteRedirect.js
// Registered under the old job route names ("TDCCareers", "MyApplications": utils/jobRoutes.OLD_JOB_ROUTES) so a push,
// notification or link that still names them lands on the right place: it replaces itself with the target from
// utils/jobRoutes.jobTarget (the jobs list, which opens JobDetails for { openJobId }). Nothing is shown.
import { useEffect } from "react";
import { jobTarget } from "../../utils/jobRoutes";

export default function JobRouteRedirect({ navigation, route }) {
  useEffect(() => {
    const t = jobTarget(route?.name, route?.params || {}, route?.params || {});
    navigation.replace(t.route, t.params);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
