import Swal from "sweetalert2";

const baseOptions = {
  confirmButtonColor: "#2563eb",
  cancelButtonColor: "#64748b",
  reverseButtons: true,
};

export async function showSuccess(message, title = "Success") {
  await Swal.fire({
    ...baseOptions,
    icon: "success",
    title,
    text: message,
  });
}

export async function showError(message, title = "Error") {
  await Swal.fire({
    ...baseOptions,
    icon: "error",
    title,
    text: message || "Something went wrong",
  });
}

export async function showInfo(message, title = "Info") {
  await Swal.fire({
    ...baseOptions,
    icon: "info",
    title,
    text: message,
  });
}

export async function confirmDanger({
  title = "Are you sure?",
  text = "This action cannot be undone.",
  confirmButtonText = "Yes",
  cancelButtonText = "Cancel",
} = {}) {
  const result = await Swal.fire({
    ...baseOptions,
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: "#dc2626",
  });
  return Boolean(result.isConfirmed);
}
