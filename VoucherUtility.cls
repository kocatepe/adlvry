public with sharing class VoucherUtility {
    //Method to get Voucher Request records except for Approved Status
    @AuraEnabled(cacheable=true)
    public static List<Voucher_Request__c> getRelatedVoucherRequest(Id campaignId){
        System.debug(campaignId);
        try {
            List<Voucher_Request__c> vrList=[SELECT Id,Voucher_Name__c,Amount__c,Approval_Status__c,
                                    Expiry_Date__c,Voucher_Type__c,Quantity__c,ServiceProviders__c,
                                    (Select Name__c from GoodsServices__r)	 
                                    FROM Voucher_Request__c 
                                    WHERE Campaign__c = :campaignId
                                    AND Approval_Status__c != :Constant.APPROVED_STATUS
                                    WITH SECURITY_ENFORCED];
            System.debug(vrList);
            return vrList;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void updateVoucherRequest(List<Voucher_Request__c> voucherRequestForUpdate) {
        // Make sure we can update the database before trying to update
        if (!Schema.sObjectType.Voucher_Request__c.isUpdateable()) {
            throw new SecurityException(
                'Insufficient permissions to update VoucherRequest'
            );
        }
        try {
            update voucherRequestForUpdate;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
        
    }
    @AuraEnabled
    public static void deleteVoucherRequests(List<String> recordIds) {
        System.debug(recordIds);
        try {
            // Check if the list is not empty before attempting deletion
            if(recordIds != null && !recordIds.isEmpty()) {
                // Delete the records
                delete [SELECT Id FROM Voucher_Request__c WHERE Id IN :recordIds];
            } 
        } catch(Exception ex) {
            // Handle the exception appropriately
            throw new AuraHandledException(ex.getMessage());
        }
    }

    @AuraEnabled
    public static void submitVoucherRequests(List<String> recordIds) {
        List<Approval.ProcessSubmitRequest> requestList = new List<Approval.ProcessSubmitRequest>();
        List<Voucher_Request__c> vrList = [SELECT Id, Approval_Status__c
                                           FROM Voucher_Request__c
                                           WHERE Id IN :recordIds];

        System.debug('vrList ==> ' + vrList);
        System.debug('vrList.size() ==> ' + vrList.size());

        //if(!vrList.isEmpty()) List<Approval.LockResult> lockResults = Approval.lock(vrList);

        for (Voucher_Request__c vr : vrList) {
            if(vr.Approval_Status__c == 'Draft'){
                Approval.ProcessSubmitRequest req = new Approval.ProcessSubmitRequest();
                req.setObjectId(vr.Id);
                req.setProcessDefinitionNameOrId('Voucher_Request_Approval');
                req.setSubmitterId(UserInfo.getUserId());
                //req1.setSkipEntryCriteria(true);
                requestList.add(req);
            }
        }

        try {
            if(!requestList.isEmpty())
                Approval.ProcessResult[] results = Approval.process(requestList);
        } catch (Exception ex) {
            List<Approval.UnlockResult> unlockResults = Approval.unlock(vrList);
            throw new AuraHandledException(ex.getMessage());
        }
    }
}