"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Github,
  Copy,
  Check,
  AlertCircle,
  XCircle,
  Loader2,
  Users,
  Clock,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { BountyFieldsFragment, DisputeReasonEnum } from "@/lib/graphql/generated";
import { StatusBadge, TypeBadge } from "./bounty-badges";
import { FcfsClaimButton } from "@/components/bounty/fcfs-claim-button";
import { CompetitionSubmission } from "@/components/bounty/competition-submission";
import { CompetitionStatus } from "@/components/bounty/competition-status";
import type { CancellationRecord } from "@/types/escrow";
import type { Bounty } from "@/types/bounty";
import {
  ApplicationDialog,
} from "@/components/bounty/application-dialog";
import { useBountyCTAState } from "./use-bounty-cta-state";
import { useRaiseDispute } from "@/hooks/use-bounty-application";

// Human-readable labels for each dispute reason
const DISPUTE_REASON_LABELS: Record<DisputeReasonEnum, string> = {
  [DisputeReasonEnum.MilestoneNotDelivered]: "Milestone Not Delivered",
  [DisputeReasonEnum.PoorQualityWork]: "Poor Quality Work",
  [DisputeReasonEnum.DeadlineMissed]: "Deadline Missed",
  [DisputeReasonEnum.ScopeChange]: "Scope Change",
  [DisputeReasonEnum.MisuseOfFunds]: "Misuse of Funds",
  [DisputeReasonEnum.CommunicationIssues]: "Communication Issues",
  [DisputeReasonEnum.Other]: "Other",
};

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface SidebarCTAProps {
  bounty: SidebarBounty;
  onCancelled?: (record: CancellationRecord) => void;
}

export function SidebarCTA({ bounty, onCancelled }: SidebarCTAProps) {
  const router = useRouter();
  const raiseDisputeMutation = useRaiseDispute();

  // Dispute dialog state
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReasonEnum | "">("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeReasonError, setDisputeReasonError] = useState("");
  const [disputeDescriptionError, setDisputeDescriptionError] = useState("");

  const handleRaiseDispute = async () => {
    // Inline validation
    let valid = true;
    if (!disputeReason) {
      setDisputeReasonError("Please select a reason.");
      valid = false;
    } else {
      setDisputeReasonError("");
    }
    if (!disputeDescription.trim()) {
      setDisputeDescriptionError("Please describe the dispute.");
      valid = false;
    } else {
      setDisputeDescriptionError("");
    }
    if (!valid) return;

    try {
      const result = await raiseDisputeMutation.mutateAsync({
        bountyId: bounty.id,
        reason: disputeReason as DisputeReasonEnum,
        description: disputeDescription.trim(),
      });
      // Reset form state before closing so onOpenChange doesn't double-reset
      setDisputeReason("");
      setDisputeDescription("");
      setDisputeReasonError("");
      setDisputeDescriptionError("");
      setDisputeDialogOpen(false);
      toast.success("Dispute filed successfully.");
      router.push(`/dispute/${result.id}`);
    } catch {
      toast.error("Failed to file dispute. Please try again.");
    }
  };

  const {
    walletAddress,
    hasJoined,
    isPastDeadline,
    joinMutation,
    handleJoin,
    handleApply,
    copied,
    handleCopy,
    cancelDialogOpen,
    setCancelDialogOpen,
    cancelReason,
    setCancelReason,
    isCancelling,
    handleCancel,
    canAct,
    isFcfs,
    isCompetition,
    canRaiseDispute,
    canCancel,
    claimCount,
    maxParticipants,
    deadline,
    isFinalized,
    submissionCount,
    ctaLabel,
    isCreator,
    applyForSlotMutation,
    handleApplyForSlot,
    isSlotsFull,
    isAlreadyJoined,
    applyForSlotButtonLabel,
  } = useBountyCTAState({ bounty, onCancelled });

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-xl border border-gray-800 bg-background-card backdrop-blur-xl shadow-sm space-y-5">
        {/* Reward */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-1">
            Reward
          </span>
          <div className="text-right">
            <p className="text-2xl font-black text-primary tabular-nums leading-tight">
              {bounty.rewardAmount != null
                ? `$${bounty.rewardAmount.toLocaleString()}`
                : "TBD"}
            </p>
            <p className="text-[10px] text-gray-500 font-medium">
              {bounty.rewardCurrency}
            </p>
          </div>
        </div>

        <Separator className="bg-gray-800/60" />

        {/* Meta */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span>Status</span>
            <StatusBadge status={bounty.status} type={bounty.type} />
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <span>Type</span>
            <TypeBadge type={bounty.type} />
          </div>
          {bounty.type === "MULTI_WINNER_MILESTONE" &&
            (() => {
              const occupied = bounty.totalSlotsOccupied ?? 0;
              const max = bounty.maxSlots ?? 5;
              return (
                <div className="flex items-center justify-between text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" /> Slots
                  </span>
                  <span className="font-medium text-gray-200">
                    {occupied} / {max}
                  </span>
                </div>
              );
            })()}
        </div>

        <Separator className="bg-gray-800/60" />

        {/* Competition slot count */}
        {isCompetition && (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Slots
            </span>
            <span className="font-medium text-gray-200">
              {claimCount}
              {maxParticipants != null ? `/${maxParticipants}` : ""} joined
            </span>
          </div>
        )}

        {isCompetition && <Separator className="bg-gray-800/60" />}

        {/* CTA */}
        {isFcfs ? (
          <FcfsClaimButton bounty={bounty} />
        ) : isCompetition ? (
          hasJoined ? (
            <Button
              className="w-full h-11 font-bold tracking-wide"
              disabled
              size="lg"
            >
              Joined ✓
            </Button>
          ) : (
            <Button
              data-testid="apply-to-bounty-btn"
              className="w-full h-11 font-bold tracking-wide"
              disabled={
                !canAct ||
                isPastDeadline ||
                joinMutation.isPending ||
                !walletAddress
              }
              size="lg"
              onClick={() => void handleJoin()}
            >
              {joinMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Users className="mr-2 size-4" />
              )}
              {canAct && !isPastDeadline ? "Join Competition" : ctaLabel()}
            </Button>
          )
        ) : bounty.type === "MULTI_WINNER_MILESTONE" && canAct && !isCreator ? (
          <Button
            className="w-full h-11 font-bold tracking-wide"
            disabled={
              isSlotsFull ||
              isAlreadyJoined ||
              !walletAddress ||
              applyForSlotMutation.isPending
            }
            size="lg"
            onClick={() => void handleApplyForSlot()}
          >
            {applyForSlotMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Users className="mr-2 size-4" />
            )}
            {applyForSlotButtonLabel}
          </Button>
        ) : bounty.type === "MILESTONE_BASED" && canAct && !isCreator ? (
          <ApplicationDialog
            bountyTitle={bounty.title}
            onApply={handleApply}
            trigger={
              <Button
                className="w-full h-11 font-bold tracking-wide"
                size="lg"
                disabled={!walletAddress}
              >
                Apply for Bounty
              </Button>
            }
          />
        ) : (
          <Button
            className="w-full h-11 font-bold tracking-wide"
            disabled={!canAct}
            size="lg"
            onClick={() =>
              canAct &&
              window.open(
                bounty.githubIssueUrl,
                "_blank",
                "noopener,noreferrer",
              )
            }
          >
            {ctaLabel()}
          </Button>
        )}

        {/* Helper text when locked out */}
        {isCompetition && !hasJoined && isPastDeadline && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center text-center">
            <Clock className="size-3 shrink-0" />
            Submission deadline has passed.
          </p>
        )}
        {!canAct && !isCompetition && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center text-center">
            <AlertCircle className="size-3 shrink-0" />
            This bounty is no longer accepting new submissions.
          </p>
        )}

        {/* Raise Dispute */}
        {canRaiseDispute && (
          <>
            <Separator className="bg-gray-800/60" />
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs h-8"
              onClick={() => setDisputeDialogOpen(true)}
            >
              <Gavel className="size-3 mr-2" />
              Raise a Dispute
            </Button>
          </>
        )}

        {/* Cancel Bounty */}
        {canCancel && (
          <>
            <Separator className="bg-gray-800/60" />
            <Button
              variant="outline"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-all"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isCancelling}
            >
              <XCircle className="size-4 mr-2" />
              Cancel Bounty
            </Button>
          </>
        )}

        {/* GitHub */}
        <a
          href={bounty.githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
        >
          <Github className="size-3" />
          View on GitHub
        </a>

        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              Copy link
            </>
          )}
        </button>
      </div>

      {/* Competition status + submission panel */}
      {isCompetition && (
        <>
          <CompetitionStatus
            claimCount={claimCount}
            maxParticipants={maxParticipants}
            submissionCount={submissionCount}
            deadline={deadline}
            isFinalized={isFinalized}
          />
          <CompetitionSubmission
            bountyId={bounty.id}
            deadline={deadline}
            hasJoined={hasJoined}
          />
        </>
      )}

      {/* Raise Dispute Dialog */}
      <AlertDialog
        open={disputeDialogOpen}
        onOpenChange={(open) => {
          if (!raiseDisputeMutation.isPending) {
            setDisputeDialogOpen(open);
            if (!open) {
              setDisputeReason("");
              setDisputeDescription("");
              setDisputeReasonError("");
              setDisputeDescriptionError("");
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Gavel className="size-5" />
              Raise a Dispute
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Describe the issue with this bounty. A moderator will review your
              dispute and reach out to both parties.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 mt-2">
            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="dispute-reason" className="text-sm font-medium">
                Reason <span className="text-red-400">*</span>
              </Label>
              <Select
                value={disputeReason}
                onValueChange={(val) => {
                  setDisputeReason(val as DisputeReasonEnum);
                  setDisputeReasonError("");
                }}
                disabled={raiseDisputeMutation.isPending}
              >
                <SelectTrigger
                  id="dispute-reason"
                  className={disputeReasonError ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.values(DisputeReasonEnum) as DisputeReasonEnum[]).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {DISPUTE_REASON_LABELS[value]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {disputeReasonError && (
                <p className="text-xs text-red-400">{disputeReasonError}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="dispute-description"
                className="text-sm font-medium"
              >
                Description <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="dispute-description"
                placeholder="Explain what happened and why you are raising this dispute…"
                value={disputeDescription}
                onChange={(e) => {
                  setDisputeDescription(e.target.value);
                  setDisputeDescriptionError("");
                }}
                className={`min-h-24 resize-none ${disputeDescriptionError ? "border-red-500" : ""}`}
                disabled={raiseDisputeMutation.isPending}
              />
              {disputeDescriptionError && (
                <p className="text-xs text-red-400">{disputeDescriptionError}</p>
              )}
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={raiseDisputeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleRaiseDispute()}
              disabled={raiseDisputeMutation.isPending}
            >
              {raiseDisputeMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Submit Dispute
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="size-5" />
              Cancel Bounty
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground space-y-2">
              <span className="block">
                Are you sure you want to cancel this bounty? This action will:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  Mark the bounty as <strong>Cancelled</strong>
                </li>
                <li>Initiate a refund of escrowed funds to your wallet</li>
                <li>
                  Notify any contributors who have started or submitted work
                </li>
              </ul>
              <span className="block text-xs text-yellow-500/80 mt-2">
                ⚠️ This action cannot be undone. Any in-progress submissions
                will be invalidated.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason" className="text-sm font-medium">
                Reason for cancellation <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g., Requirements changed, budget reallocation, issue resolved externally..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-20 resize-none"
                disabled={isCancelling}
              />
            </div>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              disabled={isCancelling}
              onClick={() => setCancelReason("")}
            >
              Keep Bounty
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isCancelling}
            >
              {isCancelling && <Loader2 className="mr-2 size-4 animate-spin" />}
              Cancel Bounty & Refund
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
