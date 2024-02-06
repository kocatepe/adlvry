public with sharing class MassApprovalController {
    @AuraEnabled
    public static void massApprove(List<Id> recordIds) {
        List<Approval.ProcessWorkitemRequest> approvalRequests = new List<Approval.ProcessWorkitemRequest>();
        
        for (Id recordId : recordIds) {
            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            req.setComments('Mass Approval Comments');
            req.setAction('Approve');
            req.setNextApproverIds(new List<Id>{});
            req.setWorkitemId(recordId);
            approvalRequests.add(req);
        }
        
        List<Approval.ProcessResult> approvalResults = Approval.process(approvalRequests);
    }

    @AuraEnabled
    public static void massReject(List<Id> recordIds) {
        List<Approval.ProcessWorkitemRequest> rejectionRequests = new List<Approval.ProcessWorkitemRequest>();
        
        for (Id recordId : recordIds) {
            Approval.ProcessWorkitemRequest req = new Approval.ProcessWorkitemRequest();
            req.setComments('Mass Rejection Comments');
            req.setAction('Reject');
            req.setNextApproverIds(new List<Id>{});
            req.setWorkitemId(recordId);
            rejectionRequests.add(req);
        }
        
        List<Approval.ProcessResult> rejectionResults = Approval.process(rejectionRequests);
    }
}